from rest_framework import serializers
from .models import Modulo, Medicion, Beam, ControlReinicio, EstadoConexion, InfoModulo, LogReinicio

class ControlReinicioSerializer(serializers.ModelSerializer):
    # Usar camelCase para el frontend
    reset_id = serializers.IntegerField(source='reset_id', read_only=True)
    
    class Meta:
        model = ControlReinicio
        fields = ['reset_id', 'nombre', 'modulo']
        
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
        
        # Mapear campos a camelCase
        return {
            'moduloId': ret.get('modulo_id'),
            'nombre': ret.get('nombre'),
            'ubicacion': ret.get('ubicacion'),
            'version': ret.get('version'),
            'up': ret.get('up'),
            'down': ret.get('down'),
            'resetId': ret.get('reset_id'),
            'reset': ret.get('reset'),
            # Agregar campos adicionales si existen
            'medicionTempActual': ret.get('medicion_temp_actual'),
            'medicionPressActual': ret.get('medicion_press_actual'),
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
            'upEsperado': ret.get('up_esperado'),
            'downEsperado': ret.get('down_esperado'),
            'upActual': ret.get('up_actual'),
            'downActual': ret.get('down_actual'),
            'estadoUp': ret.get('estado_up'),
            'estadoDown': ret.get('estado_down'),
        }

class EstadoConexionSerializer(serializers.ModelSerializer):
    class Meta:
        model = EstadoConexion
        fields = '__all__'

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