# modulos/serializers.py

from rest_framework import serializers
from .models import (
    Modulo, Medicion, Beam, ControlReinicio,
    EstadoConexion, InfoModulo, LogReinicio
)

class ControlReinicioSerializer(serializers.ModelSerializer):
    """Serializer para Control_Reinicio"""
    class Meta:
        model = ControlReinicio
        fields = ['reset_id', 'nombre', 'modulo']
        read_only_fields = ['reset_id']


class ModuloSerializer(serializers.ModelSerializer):
    """Serializer básico para Módulo"""
    reset = ControlReinicioSerializer(read_only=True)
    
    class Meta:
        model = Modulo
        fields = [
            'modulo_id', 'nombre', 'ubicacion', 'version',
            'up', 'down', 'reset'
        ]
        read_only_fields = ['modulo_id']


class ModuloDetalleSerializer(serializers.ModelSerializer):
    """Serializer detallado para Módulo con relaciones"""
    reset = ControlReinicioSerializer(read_only=True)
    total_mediciones = serializers.SerializerMethodField()
    total_apuntes = serializers.SerializerMethodField()
    ultima_conexion = serializers.SerializerMethodField()
    
    class Meta:
        model = Modulo
        fields = [
            'modulo_id', 'nombre', 'ubicacion', 'version',
            'up', 'down', 'reset',
            'total_mediciones', 'total_apuntes', 'ultima_conexion'
        ]
    
    def get_total_mediciones(self, obj):
        return obj.mediciones.count()
    
    def get_total_apuntes(self, obj):
        return obj.apuntes.count()
    
    def get_ultima_conexion(self, obj):
        ultimo_estado = obj.estados_conexion.first()
        if ultimo_estado:
            return {
                'tipo_evento': ultimo_estado.tipo_evento,
                'fecha': ultimo_estado.fecha
            }
        return None


class MedicionSerializer(serializers.ModelSerializer):
    """Serializer para Mediciones"""
    modulo_nombre = serializers.CharField(source='modulo.nombre', read_only=True)
    
    class Meta:
        model = Medicion
        fields = [
            'medicion_id', 'fecha', 'valor_temp', 'valor_press',
            'modulo', 'modulo_nombre'
        ]
        read_only_fields = ['medicion_id', 'fecha']


class BeamSerializer(serializers.ModelSerializer):
    """Serializer para Beam (Apuntes)"""
    modulo_nombre = serializers.CharField(source='modulo.nombre', read_only=True)
    
    class Meta:
        model = Beam
        fields = [
            'beam_id', 'fecha', 'valor_up', 'valor_down',
            'modulo', 'modulo_nombre'
        ]
        read_only_fields = ['beam_id', 'fecha']


class EstadoConexionSerializer(serializers.ModelSerializer):
    """Serializer para Estado_Conexion"""
    modulo_nombre = serializers.CharField(source='modulo.nombre', read_only=True)
    
    class Meta:
        model = EstadoConexion
        fields = [
            'estado_id', 'modulo', 'modulo_nombre',
            'tipo_evento', 'fecha', 'duracion_desconexion', 'detalles'
        ]
        read_only_fields = ['estado_id', 'fecha']


class InfoModuloSerializer(serializers.ModelSerializer):
    """Serializer para Info_Modulo"""
    modulo_nombre = serializers.CharField(source='modulo.nombre', read_only=True)
    
    class Meta:
        model = InfoModulo
        fields = [
            'info_id', 'modulo', 'modulo_nombre',
            'fecha_actualizacion', 'version_firmware', 'ip_address',
            'mac_address', 'uptime', 'memoria_libre',
            'temperatura_interna', 'voltaje_alimentacion',
            'signal_strength', 'activo'
        ]
        read_only_fields = ['info_id', 'fecha_actualizacion']


class LogReinicioSerializer(serializers.ModelSerializer):
    """Serializer para Log_Reinicios"""
    reset_nombre = serializers.CharField(source='reset.nombre', read_only=True)
    
    class Meta:
        model = LogReinicio
        fields = [
            'log_reset_id', 'reinicio', 'fecha',
            'reset', 'reset_nombre'
        ]
        read_only_fields = ['log_reset_id', 'fecha']


# Serializers para casos de uso específicos

class UltimaMedicionSerializer(serializers.Serializer):
    """Serializer para última medición de un módulo"""
    fecha = serializers.DateTimeField()
    valor_temp = serializers.CharField()
    valor_press = serializers.CharField()


class ApunteActualSerializer(serializers.Serializer):
    """Serializer para apunte actual de un módulo"""
    up = serializers.DecimalField(max_digits=2, decimal_places=1)
    down = serializers.DecimalField(max_digits=2, decimal_places=1)
    fecha = serializers.DateTimeField(required=False)


class EstadoResetSerializer(serializers.Serializer):
    """Serializer para estado de reset"""
    apertura = serializers.IntegerField()
    modulo_id = serializers.IntegerField()


class CambiarEstadoResetSerializer(serializers.Serializer):
    """Serializer para cambiar estado de reset"""
    apertura = serializers.IntegerField(min_value=0, max_value=1)