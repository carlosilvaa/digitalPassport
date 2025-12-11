# mqtt_publisher.py
import json
import random
import time

import paho.mqtt.client as mqtt

BROKER_HOST = "test.mosquitto.org"
BROKER_PORT = 1883

PRODUCT_ID = "68d65911e6179110444b78bb"
TOPIC = f"conveyor/operational_data/{PRODUCT_ID}"


def main():
    client_id = f"simulator-{random.randint(1000, 9999)}"
    client = mqtt.Client(client_id=client_id)
    client.connect(BROKER_HOST, BROKER_PORT, keepalive=60)

    print(f"Conectado em {BROKER_HOST}:{BROKER_PORT} como {client_id}")
    print(f"Publicando no tópico: {TOPIC}")

    try:
        while True:
            payload = {
                # campos padronizados
                "conveyor_count": random.randint(1, 5),
                "position_in_sequence": random.randint(1, 5),
                "number_of_pieces": random.randint(0, 1000),
                "last_piece_time": round(random.uniform(0.5, 10.0), 2),
                "motor_operating_time": round(random.uniform(0.5, 10.0), 2),

                "motor_status": random.choice(["running", "stopped", "warning"]),
                "input_sensor_status": random.choice(["ok", "blocked"]),
                "output_sensor_status": random.choice(["ok", "blocked"]),

                "temperature": round(random.uniform(25.0, 50.0), 2),
                "vibration": round(random.uniform(0.1, 5.0), 2),
                "current": round(random.uniform(5.0, 20.0), 2),
                "energy_consumption": round(random.uniform(5.0, 20.0), 2),
                "battery_level": random.randint(0, 100),
                "load_level": random.randint(0, 100),
            }

            msg = json.dumps(payload)
            result = client.publish(TOPIC, msg)
            print("Publicado:", msg, "| rc:", result.rc)
            time.sleep(5)
    except KeyboardInterrupt:
        print("Encerrando simulador...")
    finally:
        client.disconnect()


if __name__ == "__main__":
    main()
