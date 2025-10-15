# mqtt_handler/apps.py

from django.apps import AppConfig
import logging

logger = logging.getLogger(__name__)

class MqttHandlerConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'mqtt_handler'
    
    def ready(self):
        """Se ejecuta cuando Django inicia"""
        # Solo inicializar MQTT en el proceso principal (no en migraciones, etc.)
        import sys
        if 'runserver' in sys.argv or 'gunicorn' in sys.argv[0]:
            try:
                from .client import mqtt_client
                logger.info("🚀 Iniciando cliente MQTT...")
                mqtt_client.connect()
            except Exception as e:
                logger.error(f"❌ Error iniciando MQTT: {e}")