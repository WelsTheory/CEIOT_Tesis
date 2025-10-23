import paho.mqtt.client as mqtt
import json
import logging
import uuid
from django.conf import settings
from datetime import datetime

logger = logging.getLogger(__name__)

class MQTTClient:
    """Cliente MQTT para comunicación con módulos IoT"""
    
    def __init__(self):
        self.client = None
        self.connected = False
        # Generar client_id único usando la configuración de settings
        base_client_id = getattr(settings, 'MQTT_CLIENT_ID', 'django_backend')
        self.client_id = f"{base_client_id}_{uuid.uuid4().hex[:8]}"
        
    def on_connect(self, client, userdata, flags, rc):
        """Callback cuando se conecta al broker"""
        if rc == 0:
            logger.info("✅ Conectado al broker MQTT")
            self.connected = True
            
            # Suscribirse a topics
            self.client.subscribe("medicion/#")
            self.client.subscribe("apunte/#")
            self.client.subscribe("estado/#")
            self.client.subscribe("heartbeat/#")
            self.client.subscribe("modulos/+/info-tecnica")  # ← NUEVO TOPIC
            
            logger.info("📡 Suscrito a topics: medicion/# apunte/# estado/# heartbeat/# modulos/+/info-tecnica")
        else:
            logger.error(f"❌ Error conectando al broker MQTT. Código: {rc}")
            self.connected = False
    
    def on_disconnect(self, client, userdata, rc):
        """Callback cuando se desconecta del broker"""
        self.connected = False
        if rc != 0:
            logger.warning(f"⚠️ Desconexión inesperada del broker MQTT. Código: {rc}")
        else:
            logger.info("🔌 Desconectado del broker MQTT")
    
    def on_message(self, client, userdata, msg):
        """Callback cuando llega un mensaje"""
        try:
            topic = msg.topic
            payload = msg.payload.decode('utf-8')
            
            logger.info(f"📨 Mensaje recibido - Topic: {topic}")
            logger.debug(f"📝 Payload: {payload}")
            
            # Procesar según el topic
            if topic.startswith('medicion/'):
                self.handle_medicion(topic, payload)
            elif topic.startswith('apunte/'):
                self.handle_apunte(topic, payload)
            elif topic.startswith('estado/'):
                self.handle_estado(topic, payload)
            elif topic.startswith('heartbeat/'):
                self.handle_heartbeat(topic, payload)
            elif 'info-tecnica' in topic or (topic.startswith('modulos/') and topic.endswith('/info-tecnica')):  # ← NUEVO
                self.handle_info_tecnica(topic, payload)
            else:
                logger.warning(f"⚠️ Topic no manejado: {topic}")
                
        except Exception as e:
            logger.error(f"❌ Error procesando mensaje MQTT: {e}")
    
    def handle_medicion(self, topic, payload):
        """Procesar mediciones de temperatura y presión"""
        try:
            from modulos.models import Modulo, Medicion
            
            data = json.loads(payload)
            modulo_id = data.get('moduloId')
            valor_temp = data.get('temperatura')
            valor_press = data.get('presion')
            
            if modulo_id and (valor_temp is not None or valor_press is not None):
                modulo = Modulo.objects.get(modulo_id=modulo_id)
                
                Medicion.objects.create(
                    modulo=modulo,
                    valor_temp=str(valor_temp) if valor_temp is not None else None,
                    valor_press=str(valor_press) if valor_press is not None else None
                )
                
                logger.info(f"✅ Medición guardada - Módulo {modulo_id}: T={valor_temp}, P={valor_press}")
            else:
                logger.warning(f"⚠️ Medición incompleta: {data}")
                
        except Modulo.DoesNotExist:
            logger.error(f"❌ Módulo {modulo_id} no existe")
        except Exception as e:
            logger.error(f"❌ Error procesando medición: {e}")
    
    def handle_apunte(self, topic, payload):
        """Procesar datos de apunte (beam)"""
        try:
            from modulos.models import Modulo, Beam
            
            data = json.loads(payload)
            modulo_id = data.get('moduloId')
            
            if modulo_id:
                modulo = Modulo.objects.get(modulo_id=modulo_id)
                
                Beam.objects.create(
                    modulo=modulo,
                    up_esperado=data.get('upEsperado'),
                    down_esperado=data.get('downEsperado'),
                    up_actual=data.get('upActual'),
                    down_actual=data.get('downActual'),
                    estado_up=data.get('estadoUp', 'DESCONOCIDO'),
                    estado_down=data.get('estadoDown', 'DESCONOCIDO')
                )
                
                logger.info(f"✅ Apunte guardado - Módulo {modulo_id}")
            else:
                logger.warning(f"⚠️ Apunte sin moduloId: {data}")
                
        except Modulo.DoesNotExist:
            logger.error(f"❌ Módulo {modulo_id} no existe")
        except Exception as e:
            logger.error(f"❌ Error procesando apunte: {e}")
    
    def handle_estado(self, topic, payload):
        """Procesar cambios de estado de conexión"""
        try:
            from modulos.models import Modulo, EstadoConexion
            
            data = json.loads(payload)
            modulo_id = data.get('moduloId')
            estado = data.get('estado', 'DESCONOCIDO')
            
            if modulo_id:
                modulo = Modulo.objects.get(modulo_id=modulo_id)
                
                EstadoConexion.objects.create(
                    modulo=modulo,
                    estado=estado,
                    detalles=data.get('detalles', '')
                )
                
                logger.info(f"✅ Estado actualizado - Módulo {modulo_id}: {estado}")
            else:
                logger.warning(f"⚠️ Estado sin moduloId: {data}")
                
        except Modulo.DoesNotExist:
            logger.error(f"❌ Módulo {modulo_id} no existe")
        except Exception as e:
            logger.error(f"❌ Error procesando estado: {e}")
    
    def handle_heartbeat(self, topic, payload):
        """Procesar heartbeat (señal de vida)"""
        try:
            from modulos.models import Modulo
            
            data = json.loads(payload)
            modulo_id = data.get('moduloId')
            
            if modulo_id:
                modulo = Modulo.objects.get(modulo_id=modulo_id)
                # Actualizar última vez que se recibió heartbeat
                # Esto podría guardarse en una tabla separada o actualizar campo en Modulo
                
                logger.info(f"💓 Heartbeat recibido - Módulo {modulo_id}")
            else:
                logger.warning(f"⚠️ Heartbeat sin moduloId: {data}")
                
        except Modulo.DoesNotExist:
            logger.error(f"❌ Módulo {modulo_id} no existe")
        except Exception as e:
            logger.error(f"❌ Error procesando heartbeat: {e}")
    
    # ========================================================================
    # NUEVA FUNCIÓN: Handle Info Técnica
    # ========================================================================
    def handle_info_tecnica(self, topic, payload):
        """
        Procesar información técnica del módulo (firmware, IP, MAC, etc.)
        
        Topic esperado: modulos/{moduloId}/info-tecnica
        
        Formato del payload:
        {
            "moduloId": 14,
            "version_firmware": "v2.3.1",
            "ip_address": "192.168.1.100",
            "mac_address": "AA:BB:CC:DD:EE:FF",
            "memoria_libre": 32768,
            "temperatura_interna": 42.5,
            "voltaje_alimentacion": 3.31,
            "uptime": 345600,
            "signal_strength": -45
        }
        """
        try:
            from modulos.models import Modulo
            
            data = json.loads(payload)
            modulo_id = data.get('moduloId')
            
            if not modulo_id:
                logger.warning(f"⚠️ Info técnica sin moduloId: {data}")
                return
            
            # Buscar el módulo
            try:
                modulo = Modulo.objects.get(modulo_id=modulo_id)
            except Modulo.DoesNotExist:
                logger.error(f"❌ Módulo {modulo_id} no existe")
                return
            
            # Actualizar campos de información técnica
            updated_fields = []
            
            if 'version_firmware' in data:
                modulo.version_firmware = data['version_firmware']
                updated_fields.append('version_firmware')
            
            if 'ip_address' in data:
                modulo.direccion_ip = data['ip_address']
                updated_fields.append('direccion_ip')
            
            if 'mac_address' in data:
                modulo.direccion_mac = data['mac_address']
                updated_fields.append('direccion_mac')
            
            if 'memoria_libre' in data:
                modulo.memoria_libre = data['memoria_libre']
                updated_fields.append('memoria_libre')
            
            if 'temperatura_interna' in data:
                modulo.temperatura_interna = data['temperatura_interna']
                updated_fields.append('temperatura_interna')
            
            if 'voltaje_alimentacion' in data:
                modulo.voltaje_alimentacion = data['voltaje_alimentacion']
                updated_fields.append('voltaje_alimentacion')
            
            # Guardar cambios
            if updated_fields:
                modulo.save(update_fields=updated_fields)
                logger.info(f"✅ Info técnica actualizada - Módulo {modulo_id}: {', '.join(updated_fields)}")
            else:
                logger.warning(f"⚠️ No se actualizó ningún campo para módulo {modulo_id}")
            
            # Opcional: Crear log en InfoModulo si existe ese modelo
            try:
                from modulos.models import InfoModulo
                
                InfoModulo.objects.create(
                    modulo=modulo,
                    version_firmware=data.get('version_firmware'),
                    ip_address=data.get('ip_address'),
                    mac_address=data.get('mac_address'),
                    uptime=data.get('uptime'),
                    memoria_libre=data.get('memoria_libre'),
                    temperatura_interna=data.get('temperatura_interna'),
                    voltaje_alimentacion=data.get('voltaje_alimentacion'),
                    signal_strength=data.get('signal_strength')
                )
                logger.info(f"📝 Log de info técnica creado para módulo {modulo_id}")
                
            except ImportError:
                # El modelo InfoModulo no existe, solo actualizar Modulo
                pass
            except Exception as e:
                logger.warning(f"⚠️ No se pudo crear log de info técnica: {e}")
                
        except json.JSONDecodeError as e:
            logger.error(f"❌ Error parseando JSON de info técnica: {e}")
        except Exception as e:
            logger.error(f"❌ Error procesando info técnica: {e}")
            import traceback
            logger.error(traceback.format_exc())
    # ========================================================================
    # FIN NUEVA FUNCIÓN
    # ========================================================================
    
    def connect(self):
        """Conectar al broker MQTT"""
        try:
            # Usar el client_id único generado
            self.client = mqtt.Client(client_id=self.client_id)
            self.client.on_connect = self.on_connect
            self.client.on_disconnect = self.on_disconnect
            self.client.on_message = self.on_message
            
            # Obtener configuración de settings con valores por defecto
            broker_host = getattr(settings, 'MQTT_BROKER_HOST', 'mosquitto')
            broker_port = getattr(settings, 'MQTT_BROKER_PORT', 1883)
            keepalive = getattr(settings, 'MQTT_KEEPALIVE', 60)
            
            logger.info(f"🔌 Conectando a MQTT broker {broker_host}:{broker_port} con client_id: {self.client_id}")
            
            self.client.connect(
                broker_host,
                broker_port,
                keepalive
            )
            
            # Iniciar loop en un thread separado
            self.client.loop_start()
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Error conectando a MQTT: {e}")
            return False
    
    def disconnect(self):
        """Desconectar del broker MQTT"""
        if self.client:
            self.client.loop_stop()
            self.client.disconnect()
            logger.info("🔌 Cliente MQTT desconectado")
    
    def publish(self, topic, payload):
        """Publicar mensaje en un topic"""
        if self.connected and self.client:
            result = self.client.publish(topic, payload)
            if result.rc == mqtt.MQTT_ERR_SUCCESS:
                logger.info(f"📤 Mensaje publicado en {topic}")
                return True
            else:
                logger.error(f"❌ Error publicando mensaje: {result.rc}")
                return False
        else:
            logger.warning("⚠️ Cliente MQTT no conectado")
            return False
        
    def procesar_info_tecnica(payload):
        """
        Procesa mensajes del topic: modulos/+/info-tecnica
        
        Formato esperado:
        {
            "moduloId": 14,
            "version_firmware": "v2.3.1",
            "ip_address": "192.168.1.100",
            "mac_address": "AA:BB:CC:DD:EE:FF",
            "memoria_libre": 32768,
            "temperatura_interna": 42.5,
            "voltaje_alimentacion": 3.31,
            "uptime": 345600,
            "signal_strength": -45
        }
        """
        try:
            modulo_id = payload.get('moduloId')
            modulo = Modulo.objects.get(modulo_id=modulo_id)
            
            # Actualizar información técnica
            modulo.version_firmware = payload.get('version_firmware')
            modulo.direccion_ip = payload.get('ip_address')
            modulo.direccion_mac = payload.get('mac_address')
            modulo.memoria_libre = payload.get('memoria_libre')
            modulo.temperatura_interna = payload.get('temperatura_interna')
            modulo.voltaje_alimentacion = payload.get('voltaje_alimentacion')
            
            modulo.save()
            
            logger.info(f"✅ Info técnica actualizada para módulo {modulo_id}")
            
        except Modulo.DoesNotExist:
            logger.error(f"❌ Módulo {modulo_id} no existe")
        except Exception as e:
            logger.error(f"❌ Error procesando info técnica: {e}")


# Instancia global del cliente MQTT
mqtt_client = MQTTClient()