# modulos/serializers.py

from rest_framework import serializers
from .models import Modulo, Medicion, Beam, ControlReinicio, EstadoConexion, InfoModulo, LogReinicio

class ControlReinicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControlReinicio
        fields = '__all__'
        
    def to_representation(self, instance):
        """Convertir a camelCase"""
        ret = super().to_representation(instance)
        return {
            'resetId': ret.get('reset_id'),
            'nombre': ret.get('nombre'),
            'modulo': ret.get('modulo')
        }

class ModuloSerializer(serializers.ModelSerializer):
    reset = ControlReinicioSerializer(read_only=True)
    
    class Meta:
        model = Modulo
        fields = '__all__'
    
    def to_representation(self, instance):
        """Convertir snake_case a camelCase para el frontend"""
        ret = super().to_representation(instance)
        
        return {
            'moduloId': ret.get('modulo_id'),
            'nombre': ret.get('nombre'),
            'ubicacion': ret.get('ubicacion'),
            'version': ret.get('version'),
            'up': ret.get('up'),
            'down': ret.get('down'),
            'resetId': ret.get('reset_id'),
            'reset': ret.get('reset'),
        }

class ModuloDetalleSerializer(serializers.ModelSerializer):
    """Serializer con más detalles del módulo"""
    reset = ControlReinicioSerializer(read_only=True)
    
    class Meta:
        model = Modulo
        fields = '__all__'
    
    def to_representation(self, instance):
        """Convertir a camelCase con todos los detalles"""
        ret = super().to_representation(instance)
        
        return {
            'moduloId': ret.get('modulo_id'),
            'nombre': ret.get('nombre'),
            'ubicacion': ret.get('ubicacion'),
            'version': ret.get('version'),
            'up': ret.get('up'),
            'down': ret.get('down'),
            'tempMin': ret.get('temp_min'),
            'tempMax': ret.get('temp_max'),
            'pressMin': ret.get('press_min'),
            'pressMax': ret.get('press_max'),
            'resetId': ret.get('reset_id'),
            'reset': ret.get('reset'),
            'intervaloHeartbeat': ret.get('intervalo_heartbeat'),
            'timeoutMaximo': ret.get('timeout_maximo'),
            'intentosMaximos': ret.get('intentos_maximos'),
            'notificacionesActivas': ret.get('notificaciones_activas'),
            'fechaUltimaActualizacion': ret.get('fecha_ultima_actualizacion'),
            'estadoOperativo': ret.get('estado_operativo'),
        }

class MedicionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Medicion
        fields = '__all__'
    
    def to_representation(self, instance):
        """Convertir a camelCase"""
        ret = super().to_representation(instance)
        return {
            'medicionId': ret.get('medicion_id'),
            'moduloId': ret.get('modulo_id'),
            'fecha': ret.get('fecha'),
            'valorTemp': ret.get('valor_temp'),
            'valorPress': ret.get('valor_press'),
        }

class BeamSerializer(serializers.ModelSerializer):
    class Meta:
        model = Beam
        fields = '__all__'
    
    def to_representation(self, instance):
        """Convertir a camelCase"""
        ret = super().to_representation(instance)
        return {
            'apunteId': ret.get('apunte_id'),
            'moduloId': ret.get('modulo_id'),
            'fecha': ret.get('fecha'),
            'up': ret.get('up'),
            'down': ret.get('down'),
        }

class EstadoConexionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoConexion
        fields = '__all__'
    
    def to_representation(self, instance):
        """Convertir a camelCase"""
        ret = super().to_representation(instance)
        return {
            'estadoId': ret.get('estado_id'),
            'moduloId': ret.get('modulo_id'),
            'estado': ret.get('estado'),
            'fechaRegistro': ret.get('fecha_registro'),
            'detalles': ret.get('detalles'),
        }

class InfoModuloSerializer(serializers.ModelSerializer):
    class Meta:
        model = InfoModulo
        fields = '__all__'
    
    def to_representation(self, instance):
        """Convertir a camelCase"""
        ret = super().to_representation(instance)
        return {
            'infoId': ret.get('info_id'),
            'moduloId': ret.get('modulo_id'),
            'versionFirmware': ret.get('version_firmware'),
            'ipAddress': ret.get('ip_address'),
            'macAddress': ret.get('mac_address'),
            'uptime': ret.get('uptime'),
            'memoriaLibre': ret.get('memoria_libre'),
            'temperaturaInterna': ret.get('temperatura_interna'),
            'voltajeAlimentacion': ret.get('voltaje_alimentacion'),
            'signalStrength': ret.get('signal_strength'),
            'activo': ret.get('activo'),
            'fechaRegistro': ret.get('fecha_registro'),
        }

class LogReinicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = LogReinicio
        fields = '__all__'
    
    def to_representation(self, instance):
        """Convertir a camelCase"""
        ret = super().to_representation(instance)
        return {
            'logId': ret.get('log_id'),
            'moduloId': ret.get('modulo_id'),
            'fechaReinicio': ret.get('fecha_reinicio'),
            'motivoReinicio': ret.get('motivo_reinicio'),
            'exitoso': ret.get('exitoso'),
            'detalles': ret.get('detalles'),
        }

class UltimaMedicionSerializer(serializers.Serializer):
    """Serializer para la última medición de un módulo"""
    fecha = serializers.DateTimeField()
    valor_temp = serializers.CharField()
    valor_press = serializers.CharField()
    
    def to_representation(self, instance):
        """Convertir a camelCase"""
        if isinstance(instance, dict):
            return {
                'fecha': instance.get('fecha'),
                'valorTemp': instance.get('valor_temp'),
                'valorPress': instance.get('valor_press'),
            }
        return {
            'fecha': instance.fecha,
            'valorTemp': instance.valor_temp,
            'valorPress': instance.valor_press,
        }

class ApunteActualSerializer(serializers.Serializer):
    """Serializer para el apunte actual de un módulo"""
    up = serializers.DecimalField(max_digits=10, decimal_places=2)
    down = serializers.DecimalField(max_digits=10, decimal_places=2)
    fecha = serializers.DateTimeField(required=False, allow_null=True)
    
    def to_representation(self, instance):
        """Convertir a camelCase"""
        if isinstance(instance, dict):
            return {
                'up': float(instance.get('up', 0)),
                'down': float(instance.get('down', 0)),
                'fecha': instance.get('fecha'),
            }
        return {
            'up': float(instance.up) if hasattr(instance, 'up') else 0.0,
            'down': float(instance.down) if hasattr(instance, 'down') else 0.0,
            'fecha': getattr(instance, 'fecha', None),
        }

class EstadoResetSerializer(serializers.Serializer):
    """Serializer para el estado del reset"""
    estado = serializers.BooleanField()
    modulo_id = serializers.IntegerField(required=False)
    
    def to_representation(self, instance):
        """Convertir a camelCase"""
        if isinstance(instance, dict):
            return {
                'estado': instance.get('estado'),
                'moduloId': instance.get('modulo_id'),
            }
        return {
            'estado': getattr(instance, 'estado', False),
            'moduloId': getattr(instance, 'modulo_id', None),
        }

class CambiarEstadoResetSerializer(serializers.Serializer):
    """Serializer para cambiar estado de reset"""
    apertura = serializers.IntegerField(min_value=0, max_value=1)