from django.utils import timezone
from datetime import timedelta
from .models import Modulo

def sidebar_stats(request):
    """
    Context processor para estadísticas del sidebar.
    Disponible en todas las plantillas.
    """
    if not request.user.is_authenticated:
        return {}
    
    # Total de módulos
    total_modulos = Modulo.objects.count()
    
    # Calcular estados
    modulos_activos = 0
    modulos_alerta = 0
    modulos_offline = 0
    
    hace_5_min = timezone.now() - timedelta(minutes=5)
    hace_15_min = timezone.now() - timedelta(minutes=15)
    
    for modulo in Modulo.objects.prefetch_related('mediciones'):
        ultima_medicion = modulo.mediciones.first()
        
        if ultima_medicion:
            if ultima_medicion.fecha >= hace_5_min:
                modulos_activos += 1
            elif ultima_medicion.fecha >= hace_15_min:
                modulos_alerta += 1
            else:
                modulos_offline += 1
        else:
            modulos_offline += 1
    
    # Conteo por ubicación
    ubicaciones = {}
    for ubicacion in ['Norte', 'Este', 'Oeste', 'Sur']:
        ubicaciones[ubicacion] = Modulo.objects.filter(ubicacion=ubicacion).count()
    
    return {
        'stats': {
            'total': total_modulos,
            'online': modulos_activos,
            'warning': modulos_alerta,
            'offline': modulos_offline,
        },
        'ubicaciones': ubicaciones,
    }