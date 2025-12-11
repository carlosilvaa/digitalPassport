# apps/products/mqtt_worker.py
import json
import logging
import random
import threading
import time

import paho.mqtt.client as mqtt
from django.conf import settings

from apps.products.models import Products
from apps.products.services import apply_operational_delta

logger = logging.getLogger(__name__)

_worker_started = False


def start_mqtt_worker():
    global _worker_started
    if _worker_started:
        return
    _worker_started = True

    broker_host = getattr(settings, "MQTT_BROKER_HOST", "test.mosquitto.org")
    broker_port = int(getattr(settings, "MQTT_BROKER_PORT", 1883))
    topic = getattr(settings, "MQTT_TOPIC", "conveyor/operational_data/#")

    print(f">>> start_mqtt_worker(): iniciando worker MQTT em {broker_host}:{broker_port}, tópico {topic}")

    def on_connect(client, userdata, flags, rc, properties=None):
        if rc == 0:
            print(f">>> MQTT conectado em {broker_host}:{broker_port}")
            client.subscribe(topic)
            print(f">>> MQTT subscribed em {topic}")
        else:
            print(f">>> Falha ao conectar MQTT (rc={rc})")

    def on_message(client, userdata, msg):
        topic = msg.topic
        payload_bytes = msg.payload

        payload = payload_bytes.decode("utf-8", errors="ignore")
        print(f">>> MQTT msg recebida em {topic}: {payload}")

        parts = topic.split("/")
        # Esperamos: conveyor/operational_data/<productId>
        if len(parts) < 3:
            print(">>> Tópico inválido para operational_data:", topic)
            return

        product_id = parts[-1]

        try:
            data = json.loads(payload)
        except json.JSONDecodeError:
            print(">>> Payload MQTT não é JSON válido:", payload)
            return

        product = Products.objects(id=product_id).first()
        if not product:
            print(f">>> Produto {product_id} não encontrado para tópico {topic}")
            return

        # CHAMADA DIRETA (sem try/except engolindo erro)
        print(">>> Chamando apply_operational_delta() para produto", product_id)
        res = apply_operational_delta(
            product=product,
            delta=data,
            source="broker",
            source_channel="mqtt_backend",
            actor_id=None,
            actor_name=None,
            notes="Atualização de dados operacionais via MQTT backend",
            raw_topic=topic,
            raw_payload=payload,
        )
        print(">>> apply_operational_delta() retornou:", res)

    def worker_loop():
        nonlocal broker_host, broker_port
        while True:
            try:
                client_id = f"django-backend-{random.randint(1000, 9999)}"
                print(">>> Criando cliente MQTT", client_id)
                client = mqtt.Client(client_id=client_id)
                client.on_connect = on_connect
                client.on_message = on_message

                client.connect(broker_host, broker_port, keepalive=60)
                print(">>> Chamando loop_forever() do MQTT (worker em execução)")
                client.loop_forever()
            except Exception:
                # aqui sim logamos, mas NÃO engolimos silenciosamente
                logger.exception("MQTT worker caiu, tentando reconectar em 5s...")
                print(">>> EXCEÇÃO NO MQTT WORKER, veja stacktrace acima")
                time.sleep(5)

    thread = threading.Thread(target=worker_loop, name="mqtt-worker", daemon=True)
    thread.start()
    print(">>> MQTT worker thread iniciado.")
