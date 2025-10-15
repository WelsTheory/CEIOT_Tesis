# modulos/admin.py

from django.contrib import admin
from .models import Modulo, Medicion, Beam, ControlReinicio, EstadoConexion, InfoModulo, LogReinicio

@admin.register(Modulo)
class ModuloAdmin(admin.ModelAdmin):
    list_display = ['modulo_id', 'nombre', 'ubicacion', 'version', 'up', 'down']
    list_filter = ['ubicacion', 'version']
    search_fields = ['nombre']

@admin.register(Medicion)
class MedicionAdmin(admin.ModelAdmin):
    list_display = ['medicion_id', 'modulo', 'fecha', 'valor_temp', 'valor_press']
    list_filter = ['fecha', 'modulo']
    date_hierarchy = 'fecha'

@admin.register(Beam)
class BeamAdmin(admin.ModelAdmin):
    list_display = ['beam_id', 'modulo', 'fecha', 'valor_up', 'valor_down']
    list_filter = ['fecha', 'modulo']
    date_hierarchy = 'fecha'

@admin.register(ControlReinicio)
class ControlReinicioAdmin(admin.ModelAdmin):
    list_display = ['reset_id', 'nombre', 'modulo']

@admin.register(EstadoConexion)
class EstadoConexionAdmin(admin.ModelAdmin):
    list_display = ['estado_id', 'modulo', 'tipo_evento', 'fecha', 'duracion_desconexion']
    list_filter = ['tipo_evento', 'fecha']
    date_hierarchy = 'fecha'

@admin.register(InfoModulo)
class InfoModuloAdmin(admin.ModelAdmin):
    list_display = ['info_id', 'modulo', 'version_firmware', 'ip_address', 'activo']
    list_filter = ['activo', 'version_firmware']

@admin.register(LogReinicio)
class LogReinicioAdmin(admin.ModelAdmin):
    list_display = ['log_reset_id', 'reset', 'reinicio', 'fecha']
    list_filter = ['fecha']
    date_hierarchy = 'fecha'