from django.apps import AppConfig
import logging
import os

logger = logging.getLogger(__name__)


class ProductsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.products"

    def ready(self):
        if os.environ.get("RUN_MAIN") != "true":
            return

        print(">>> ProductsConfig.ready() chamado (inicializando app products)")

        from .mqtt_worker import start_mqtt_worker
        start_mqtt_worker()
        print(">>> start_mqtt_worker() disparado a partir do ready()")
