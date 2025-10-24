# modulos/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Max, Avg, Count, Q
import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth.decorators import login_required  
from django.shortcuts import render, get_object_or_404, redirect  # ← Agregar redirect
from django.http import HttpResponse, JsonResponse
from django.template.loader import render_to_string
from django.views.decorators.csrf import csrf_exempt, csrf_protect
from django.utils.decorators import method_decorator
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from .models import Notificacion, Modulo
from django.shortcuts import render


from .models import (
    Modulo, Medicion, Beam, ControlReinicio,
    EstadoConexion, InfoModulo, LogReinicio,
    Notificacion
)
from .serializers import (
    ModuloSerializer, ModuloDetalleSerializer,
    MedicionSerializer, BeamSerializer,
    ControlReinicioSerializer, EstadoConexionSerializer,
    InfoModuloSerializer, LogReinicioSerializer,
    UltimaMedicionSerializer, ApunteActualSerializer,
    EstadoResetSerializer, CambiarEstadoResetSerializer
)

from mqtt_handler.client import mqtt_client
import json
from .models import Modulo,ControlReinicio,Medicion


class ModuloViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gestionar Módulos
    """
    queryset = Modulo.objects.all()
    serializer_class = ModuloSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Usar serializer detallado para retrieve"""
        if self.action == 'retrieve':
            return ModuloDetalleSerializer
        return ModuloSerializer
    
    @action(detail=True, methods=['get'])
    def mediciones(self, request, pk=None):
        """
        GET /modulo/{id}/mediciones/
        Obtener todas las mediciones de un módulo
        """
        modulo = self.get_object()
        mediciones = modulo.mediciones.all()
        serializer = MedicionSerializer(mediciones, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def ultima_medicion(self, request, pk=None):
        """
        GET /modulo/{id}/ultima-medicion/
        Obtener la última medición de un módulo
        """
        modulo = self.get_object()
        ultima = modulo.mediciones.first()  # Ya está ordenado por -fecha
        
        if ultima:
            data = {
                'fecha': ultima.fecha,
                'valor_temp': ultima.valor_temp,
                'valor_press': ultima.valor_press
            }
            serializer = UltimaMedicionSerializer(data)
            return Response(serializer.data)
        
        return Response(
            {'error': 'No hay mediciones para este módulo'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['get'])
    def apunte(self, request, pk=None):
        """
        GET /modulo/{id}/apunte/
        Obtener el apunte actual del módulo
        """
        modulo = self.get_object()
        data = {
            'up': modulo.up,
            'down': modulo.down
        }
        serializer = ApunteActualSerializer(data)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def historial_apuntes(self, request, pk=None):
        """
        GET /modulo/{id}/historial-apuntes/
        Obtener historial de apuntes (Beam)
        """
        modulo = self.get_object()
        apuntes = modulo.apuntes.all()
        serializer = BeamSerializer(apuntes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def apuntes(self, request, pk=None):
        """
        GET /modulo/{id}/apuntes/?fechaDesde=YYYY-MM-DD&fechaHasta=YYYY-MM-DD
        Obtener apuntes filtrados por rango de fechas
        """
        modulo = self.get_object()
        fecha_desde = request.query_params.get('fechaDesde')
        fecha_hasta = request.query_params.get('fechaHasta')
        
        apuntes = modulo.apuntes.all()
        
        if fecha_desde:
            try:
                fecha_desde_dt = datetime.strptime(fecha_desde, '%Y-%m-%d')
                apuntes = apuntes.filter(fecha__gte=fecha_desde_dt)
            except ValueError:
                return Response(
                    {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if fecha_hasta:
            try:
                fecha_hasta_dt = datetime.strptime(fecha_hasta, '%Y-%m-%d')
                # Incluir todo el día hasta las 23:59:59
                fecha_hasta_dt = fecha_hasta_dt + timedelta(days=1) - timedelta(seconds=1)
                apuntes = apuntes.filter(fecha__lte=fecha_hasta_dt)
            except ValueError:
                return Response(
                    {'error': 'Formato de fecha inválido. Use YYYY-MM-DD'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        serializer = BeamSerializer(apuntes, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def estado(self, request, pk=None):
        """
        GET /modulo/{id}/estado/
        Obtener estado de conexión del módulo
        """
        modulo = self.get_object()
        ultimo_estado = modulo.estados_conexion.first()
        
        if ultimo_estado:
            serializer = EstadoConexionSerializer(ultimo_estado)
            return Response(serializer.data)
        
        return Response(
            {'tipo_evento': 'DESCONOCIDO', 'mensaje': 'Sin historial de conexión'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def abrir(self, request, pk=None):
        """POST /modulo/{id}/abrir/ - Abrir reset del módulo"""
        modulo = self.get_object()
        
        if modulo.reset:
            # Publicar comando MQTT
            comando = {
                'modulo_id': modulo.modulo_id,
                'resetId': modulo.reset.reset_id,
                'accion': 'abrir',
                'timestamp': datetime.now().isoformat()
            }
            
            topic = f'comando/reset/{modulo.modulo_id}'
            mqtt_client.publish(topic, json.dumps(comando))
            
            # Registrar en log
            LogReinicio.objects.create(
                reset=modulo.reset,
                reinicio=1
            )
            
            return Response({
                'mensaje': 'Comando de apertura enviado',
                'modulo_id': modulo.modulo_id,
                'reset_id': modulo.reset.reset_id
            })
        
        return Response(
            {'error': 'El módulo no tiene control de reset asignado'},
            status=status.HTTP_400_BAD_REQUEST
        )

    @action(detail=True, methods=['post'])
    def cerrar(self, request, pk=None):
        """POST /modulo/{id}/cerrar/ - Cerrar reset del módulo"""
        modulo = self.get_object()
        
        if modulo.reset:
            # Publicar comando MQTT
            comando = {
                'modulo_id': modulo.modulo_id,
                'resetId': modulo.reset.reset_id,
                'accion': 'cerrar',
                'timestamp': datetime.now().isoformat()
            }
            
            topic = f'comando/reset/{modulo.modulo_id}'
            mqtt_client.publish(topic, json.dumps(comando))
            
            # Registrar en log
            LogReinicio.objects.create(
                reset=modulo.reset,
                reinicio=0
            )
            
            return Response({
                'mensaje': 'Comando de cierre enviado',
                'modulo_id': modulo.modulo_id,
                'reset_id': modulo.reset.reset_id
            })
        
        return Response(
            {'error': 'El módulo no tiene control de reset asignado'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['get'])
    def sistema_info(self, request, pk=None):
        """
        GET /modulo/{id}/sistema-info/
        Obtener información técnica del módulo
        """
        modulo = self.get_object()
        info = modulo.info_tecnica.filter(activo=True).first()
        
        if info:
            serializer = InfoModuloSerializer(info)
            return Response(serializer.data)
        
        return Response(
            {'error': 'No hay información del sistema disponible'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['get'])
    def info_tecnica(self, request, pk=None):
        """
        GET /modulo/{id}/info-tecnica/
        Obtener información técnica básica (IP, firmware, MAC)
        """
        modulo = self.get_object()
        info = modulo.info_tecnica.filter(activo=True).first()
        
        if info:
            data = {
                'direccionIP': info.ip_address,
                'firmware': info.version_firmware,
                'direccionMAC': info.mac_address
            }
            return Response(data)
        
        return Response(
            {'error': 'No hay información técnica disponible'},
            status=status.HTTP_404_NOT_FOUND
        )
    
    @action(detail=True, methods=['get'])
    def metricas_sistema(self, request, pk=None):
        """
        GET /modulo/{id}/metricas-sistema/
        Obtener métricas del sistema (memoria, temperatura, voltaje)
        """
        modulo = self.get_object()
        info = modulo.info_tecnica.filter(activo=True).first()
        
        if info:
            data = {
                'memoriaLibre': info.memoria_libre,
                'temperaturaInterna': float(info.temperatura_interna) if info.temperatura_interna else None,
                'voltajeAlimentacion': float(info.voltaje_alimentacion) if info.voltaje_alimentacion else None
            }
            return Response(data)
        
        return Response(
            {'error': 'No hay métricas del sistema disponibles'},
            status=status.HTTP_404_NOT_FOUND
        )


class MedicionViewSet(viewsets.ModelViewSet):
    """ViewSet para Mediciones"""
    queryset = Medicion.objects.all()
    serializer_class = MedicionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar por módulo si se especifica"""
        queryset = super().get_queryset()
        modulo_id = self.request.query_params.get('modulo')
        
        if modulo_id:
            queryset = queryset.filter(modulo_id=modulo_id)
        
        return queryset


class BeamViewSet(viewsets.ModelViewSet):
    """ViewSet para Beam (Apuntes)"""
    queryset = Beam.objects.all()
    serializer_class = BeamSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Filtrar por módulo si se especifica"""
        queryset = super().get_queryset()
        modulo_id = self.request.query_params.get('modulo')
        
        if modulo_id:
            queryset = queryset.filter(modulo_id=modulo_id)
        
        return queryset


class ControlReinicioViewSet(viewsets.ModelViewSet):
    """ViewSet para Control_Reinicio"""
    queryset = ControlReinicio.objects.all()
    serializer_class = ControlReinicioSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def reset(self, request):
        """
        POST /modulo/reset/
        Cambiar estado de reset
        Body: {"apertura": 0 o 1}
        """
        serializer = CambiarEstadoResetSerializer(data=request.data)
        
        if serializer.is_valid():
            apertura = serializer.validated_data['apertura']
            
            # Aquí implementarías la lógica MQTT
            # Por ahora solo devolvemos confirmación
            
            return Response({
                'mensaje': 'Estado de reset cambiado',
                'apertura': apertura
            })
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class EstadoConexionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para Estado_Conexion (solo lectura)"""
    queryset = EstadoConexion.objects.all()
    serializer_class = EstadoConexionSerializer
    permission_classes = [IsAuthenticated]


class InfoModuloViewSet(viewsets.ModelViewSet):
    """ViewSet para Info_Modulo"""
    queryset = InfoModulo.objects.all()
    serializer_class = InfoModuloSerializer
    permission_classes = [IsAuthenticated]


class LogReinicioViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet para Log_Reinicios (solo lectura)"""
    queryset = LogReinicio.objects.all()
    serializer_class = LogReinicioSerializer
    permission_classes = [IsAuthenticated]

from django.shortcuts import render
from django.contrib import messages
from django.http import JsonResponse

@login_required
def test_base_template(request):
    """Vista de prueba para verificar el template base y componentes"""
    messages.success(request, '¡Template base cargado exitosamente!')
    messages.info(request, 'Los componentes están funcionando correctamente')
    messages.warning(request, 'Esta es una advertencia de prueba')
    
    context = {
        'page_title': 'Test - Etapa 1',
        'test_data': {
            'total_modulos': 64,
            'activos': 58,
            'alertas': 4,
            'desconectados': 2
        }
    }
    return render(request, 'test/base_test.html', context)

def test_htmx(request):
    """Endpoint de prueba para htmx"""
    if request.headers.get('HX-Request'):
        return render(request, 'test/htmx_response.html', {
            'timestamp': 'Actualizado con htmx',
            'data': 'Contenido dinámico cargado exitosamente'
        })
    return JsonResponse({'error': 'Esta vista requiere htmx'})

@login_required
def dashboard(request):
    """Dashboard principal con datos reales y notificaciones automáticas"""
    from django.db.models import Count, Q, Avg, Max
    from datetime import datetime, timedelta
    import re
    
    # Filtros de la URL
    ubicacion_filter = request.GET.get('ubicacion', 'all')
    estado_filter = request.GET.get('estado', 'all')
    
    # Query base de módulos
    modulos_query = Modulo.objects.select_related('reset').prefetch_related('mediciones')
    
    # Aplicar filtros
    if ubicacion_filter != 'all':
        modulos_query = modulos_query.filter(ubicacion__iexact=ubicacion_filter)
    
    # Obtener todos los módulos
    modulos = modulos_query.all()
    
    # Procesar cada módulo con su última medición y estado
    modulos_data = []
    modulos_con_problemas = []
    
    for modulo in modulos:
        # Última medición
        ultima_medicion = modulo.mediciones.first()

        estado_up = 'correcto'
        estado_dw = 'correcto'
        
        # Determinar estado
        if ultima_medicion:
            tiempo_desde_medicion = datetime.now() - ultima_medicion.fecha.replace(tzinfo=None)
            if tiempo_desde_medicion.total_seconds() < 300:  # 5 minutos
                estado = 'online'
            elif tiempo_desde_medicion.total_seconds() < 900:  # 15 minutos
                estado = 'warning'
            else:
                estado = 'offline'
                modulos_con_problemas.append(modulo)
        else:
            estado = 'offline'
            modulos_con_problemas.append(modulo)

        tiene_mismatch = (estado_up == 'mismatch' or estado_dw == 'mismatch')

        if estado == 'online' and tiene_mismatch:
            estado = 'warning'
            modulos_con_problemas.append(modulo)
        
        # Aplicar filtro de estado
        if estado_filter != 'all' and estado != estado_filter:
            continue
        
        modulos_data.append({
            'modulo_id': modulo.modulo_id,
            'nombre': modulo.nombre,
            'ubicacion': modulo.ubicacion,
            'version': modulo.version,
            'up': float(modulo.up) if modulo.up else 0,
            'down': float(modulo.down) if modulo.down else 0,
            'estado': estado,
            'temperatura': float(ultima_medicion.valor_temp) if ultima_medicion and ultima_medicion.valor_temp else 0,
            'presion': float(ultima_medicion.valor_press) if ultima_medicion and ultima_medicion.valor_press else 0,
            'ultima_medicion': ultima_medicion.fecha if ultima_medicion else None,
            'estado_up':'estado_up',
            'estado_dw':'estado_dw',
            'tiene_mismatch': tiene_mismatch,
        })
    
    # Crear notificaciones para módulos con problemas (una vez al día máximo)
    if modulos_con_problemas:
        hoy = timezone.now().date()
        for modulo in modulos_con_problemas[:3]:  # Limitar a 3 para no saturar
            # Verificar si ya se notificó hoy
            notif_hoy = Notificacion.objects.filter(
                usuario=request.user,
                modulo=modulo,
                fecha_creacion__date=hoy,
                tipo='warning'
            ).exists()
            
            if not notif_hoy:
                crear_notificacion_modulo_offline(request.user, modulo)
    
    # Función para extraer el número del nombre del módulo para ordenamiento numérico
    def extraer_numero(nombre):
        match = re.search(r'\d+', nombre)
        return int(match.group()) if match else 0
    
    # ORDENAMIENTO
    orden_ubicacion = {'Norte': 1, 'Este': 2, 'Oeste': 3, 'Sur': 4}
    modulos_data.sort(key=lambda m: (orden_ubicacion.get(m['ubicacion'], 5), extraer_numero(m['nombre']), m['nombre']))
    
    # Estadísticas generales
    total_modulos = len(modulos)
    modulos_activos = len([m for m in modulos_data if m['estado'] == 'online'])
    modulos_alerta = len([m for m in modulos_data if m['estado'] == 'warning'])
    modulos_offline = len([m for m in modulos_data if m['estado'] == 'offline'])
    
    # Estadísticas por ubicación
    ubicaciones = {}
    for ubicacion in ['Norte', 'Sur', 'Este', 'Oeste']:
        ubicaciones[ubicacion] = len([m for m in modulos_data if m['ubicacion'] == ubicacion])
    
    # Enriquecer datos de módulos
    modulos_enriquecidos = []
    for modulo in modulos:
        ultima_medicion = modulo.mediciones.first()
        
        # Determinar estado
        if ultima_medicion:
            hace_5_min = timezone.now() - timedelta(minutes=5)
            hace_15_min = timezone.now() - timedelta(minutes=15)
            
            if ultima_medicion.fecha >= hace_5_min:
                estado = 'online'
            elif ultima_medicion.fecha >= hace_15_min:
                estado = 'warning'
            else:
                estado = 'offline'
        else:
            estado = 'offline'
    
    modulo.estado = estado
    modulo.temperatura = float(ultima_medicion.valor_temp) if ultima_medicion and ultima_medicion.valor_temp else 0
    modulo.presion = float(ultima_medicion.valor_press) if ultima_medicion and ultima_medicion.valor_press else 0
    modulo.ultima_medicion = ultima_medicion.fecha if ultima_medicion else None

    if not hasattr(modulo, 'version_firmware'):
            modulo.version_firmware = "N/A"
    if not hasattr(modulo, 'direccion_ip'):
        modulo.direccion_ip = "N/A"
    if not hasattr(modulo, 'direccion_mac'):
        modulo.direccion_mac = "N/A"
        
    modulos_enriquecidos.append(modulo)

    context = {
        'modulos': modulos_enriquecidos,
        'page_title': 'Dashboard',
        'modulos': modulos_data,
        'stats': {
            'total': total_modulos,
            'online': modulos_activos,
            'warning': modulos_alerta,
            'offline': modulos_offline,
        },
        'ubicaciones': ubicaciones,
        'filtro_ubicacion': ubicacion_filter,
        'filtro_estado': estado_filter,
    }
    
    return render(request, 'modulos/dashboard.html', context)

@login_required
def modulos_list(request):
    """Listado completo de módulos con filtros"""
    from django.db.models import Q
    import re
    
    # Obtener parámetros de búsqueda y filtros
    search_query = request.GET.get('q', '')
    ubicacion_filter = request.GET.get('ubicacion', '')
    version_filter = request.GET.get('version', '')
    
    # Query base
    modulos = Modulo.objects.select_related('reset').prefetch_related('mediciones')
    
    # Aplicar búsqueda
    if search_query:
        modulos = modulos.filter(
            Q(nombre__icontains=search_query) |
            Q(ubicacion__icontains=search_query)
        )
    
    # Aplicar filtros
    if ubicacion_filter:
        modulos = modulos.filter(ubicacion__iexact=ubicacion_filter)
    
    if version_filter:
        modulos = modulos.filter(version=version_filter)
    
    # Convertir a lista para ordenamiento personalizado
    modulos_list = list(modulos)
    
    # Función para extraer el número del nombre del módulo
    def extraer_numero(modulo):
        match = re.search(r'\d+', modulo.nombre)
        return int(match.group()) if match else 0
    
    # ORDENAMIENTO: Primero por ubicación (Norte, Este, Oeste, Sur), luego por número
    orden_ubicacion = {'Norte': 1, 'Este': 2, 'Oeste': 3, 'Sur': 4}
    modulos_list.sort(key=lambda m: (orden_ubicacion.get(m.ubicacion, 5), extraer_numero(m), m.nombre))
    
    context = {
        'page_title': 'Todos los Módulos',
        'modulos': modulos_list,
        'search_query': search_query,
        'ubicacion_filter': ubicacion_filter,
        'version_filter': version_filter,
    }
    
    return render(request, 'modulos/list.html', context)

@login_required
def modulo_detail(request, modulo_id):
    """Vista detallada de un módulo específico"""
    from django.shortcuts import get_object_or_404
    from datetime import datetime, timedelta
    
    # Obtener módulo
    modulo = get_object_or_404(Modulo.objects.select_related('reset'), modulo_id=modulo_id)
    
    # Última medición
    ultima_medicion = modulo.mediciones.first()
    
    # Últimas 10 mediciones
    ultimas_mediciones = modulo.mediciones.all()[:10]
    
    # Mediciones de las últimas 24 horas para gráfico
    hace_24h = datetime.now() - timedelta(hours=24)
    mediciones_24h = modulo.mediciones.filter(fecha__gte=hace_24h).order_by('fecha')
    
    # Preparar datos para gráfico
    chart_data = {
        'labels': [m.fecha.strftime('%H:%M') for m in mediciones_24h],
        'temperatura': [float(m.valor_temp) if m.valor_temp else 0 for m in mediciones_24h],
        'presion': [float(m.valor_press) if m.valor_press else 0 for m in mediciones_24h],
    }
    
    # Determinar estado
    if ultima_medicion:
        tiempo_desde_medicion = datetime.now() - ultima_medicion.fecha.replace(tzinfo=None)
        if tiempo_desde_medicion.total_seconds() < 300:  # 5 minutos
            estado = 'online'
        elif tiempo_desde_medicion.total_seconds() < 900:  # 15 minutos
            estado = 'warning'
        else:
            estado = 'offline'
    else:
        estado = 'offline'
    
    # Información técnica (si existe)
    info_tecnica = modulo.info_tecnica.filter(activo=True).first()
    
    # Estadísticas del módulo
    from django.db.models import Avg, Max, Min, Count
    stats_modulo = modulo.mediciones.aggregate(
        temp_promedio=Avg('valor_temp'),
        temp_max=Max('valor_temp'),
        temp_min=Min('valor_temp'),
        press_promedio=Avg('valor_press'),
        press_max=Max('valor_press'),
        press_min=Min('valor_press'),
        total_mediciones=Count('medicion_id')
    )
    
    context = {
        'page_title': f'Detalle - {modulo.nombre}',
        'modulo': modulo,
        'estado': estado,
        'ultima_medicion': ultima_medicion,
        'ultimas_mediciones': ultimas_mediciones,
        'chart_data': chart_data,
        'info_tecnica': info_tecnica,
        'stats_modulo': stats_modulo,
    }
    
    return render(request, 'modulos/detalle.html', context)


@login_required
def modulo_mediciones(request, modulo_id):
    """Historial completo de mediciones de un módulo"""
    from django.shortcuts import get_object_or_404
    from django.core.paginator import Paginator
    from datetime import datetime, timedelta
    
    modulo = get_object_or_404(Modulo, modulo_id=modulo_id)
    
    # Filtros de fecha
    fecha_desde = request.GET.get('desde', '')
    fecha_hasta = request.GET.get('hasta', '')
    
    # Query de mediciones
    mediciones = modulo.mediciones.all()
    
    # Aplicar filtros de fecha
    if fecha_desde:
        mediciones = mediciones.filter(fecha__gte=fecha_desde)
    
    if fecha_hasta:
        mediciones = mediciones.filter(fecha__lte=fecha_hasta)
    
    # Paginación
    paginator = Paginator(mediciones, 50)  # 50 mediciones por página
    page_number = request.GET.get('page', 1)
    page_obj = paginator.get_page(page_number)
    
    # Datos para gráfico (últimas 100 mediciones)
    mediciones_grafico = mediciones[:100]
    chart_data = {
        'labels': [m.fecha.strftime('%d/%m %H:%M') for m in reversed(list(mediciones_grafico))],
        'temperatura': [float(m.valor_temp) if m.valor_temp else 0 for m in reversed(list(mediciones_grafico))],
        'presion': [float(m.valor_press) if m.valor_press else 0 for m in reversed(list(mediciones_grafico))],
    }
    
    context = {
        'page_title': f'Mediciones - {modulo.nombre}',
        'modulo': modulo,
        'page_obj': page_obj,
        'chart_data': chart_data,
        'fecha_desde': fecha_desde,
        'fecha_hasta': fecha_hasta,
    }
    
    return render(request, 'modulos/mediciones.html', context)


@login_required
def modulo_control(request, modulo_id):
    """Panel de control para encender/apagar módulo"""
    from django.shortcuts import get_object_or_404
    from django.http import JsonResponse
    
    modulo = get_object_or_404(Modulo, modulo_id=modulo_id)
    
    if request.method == 'POST':
        accion = request.POST.get('accion')
        
        if accion == 'encender':
            # Lógica para encender (publicar MQTT)
            # mqtt_client.publish(f"modulos/{modulo_id}/control", "ON")
            messages.success(request, f'Comando de encendido enviado a {modulo.nombre}')
        
        elif accion == 'apagar':
            # Lógica para apagar (publicar MQTT)
            # mqtt_client.publish(f"modulos/{modulo_id}/control", "OFF")
            messages.success(request, f'Comando de apagado enviado a {modulo.nombre}')
        
        elif accion == 'reiniciar':
            # Lógica para reiniciar
            messages.success(request, f'Comando de reinicio enviado a {modulo.nombre}')
        
        # Si es petición AJAX (htmx)
        if request.headers.get('HX-Request'):
            return JsonResponse({'status': 'success', 'message': 'Comando enviado'})
        
        return redirect('modulo_detail', modulo_id=modulo_id)
    
    context = {
        'page_title': f'Control - {modulo.nombre}',
        'modulo': modulo,
    }
    
    return render(request, 'modulos/control.html', context)

@login_required
def dashboard_stats_partial(request):
    """Vista parcial para actualizar solo las estadísticas del dashboard"""
    from django.db.models import Count, Q
    from datetime import datetime, timedelta
    
    # Calcular estadísticas
    total_modulos = Modulo.objects.count()
    
    # Obtener módulos con última medición
    hace_5_min = timezone.now() - timedelta(minutes=5)
    hace_15_min = timezone.now() - timedelta(minutes=15)
    
    modulos_activos = 0
    modulos_alerta = 0
    modulos_offline = 0
    
    for modulo in Modulo.objects.all():
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
    
    context = {
        'stats': {
            'total': total_modulos,
            'activos': modulos_activos,
            'alertas': modulos_alerta,
            'desconectados': modulos_offline,
        }
    }
    
    html = render_to_string('modulos/partials/stats_cards.html', context, request=request)
    return HttpResponse(html)


@login_required
def modulo_card_partial(request, modulo_id):
    """Vista parcial para actualizar un solo card de módulo"""
    from datetime import timedelta
    
    modulo = get_object_or_404(Modulo, modulo_id=modulo_id)
    ultima_medicion = modulo.mediciones.first()
    
    # Determinar estado
    if ultima_medicion:
        hace_5_min = timezone.now() - timedelta(minutes=5)
        hace_15_min = timezone.now() - timedelta(minutes=15)
        
        if ultima_medicion.fecha >= hace_5_min:
            estado = 'online'
        elif ultima_medicion.fecha >= hace_15_min:
            estado = 'warning'
        else:
            estado = 'offline'
    else:
        estado = 'offline'
    
    modulo_data = {
        'id': modulo.modulo_id,
        'nombre': modulo.nombre,
        'ubicacion': modulo.ubicacion,
        'version': modulo.version,
        'up': float(modulo.up) if modulo.up else 0,
        'down': float(modulo.down) if modulo.down else 0,
        'estado': estado,
        'temperatura': float(ultima_medicion.valor_temp) if ultima_medicion and ultima_medicion.valor_temp else 0,
        'presion': float(ultima_medicion.valor_press) if ultima_medicion and ultima_medicion.valor_press else 0,
        'ultima_medicion': ultima_medicion.fecha if ultima_medicion else None,
    }
    
    context = {
        'page_title': f'Control - {modulo.nombre}',
        'modulo': modulo,  # ← Debe pasar el objeto completo, no un dict
    }
    html = render_to_string('modulos/partials/modulo_card.html', context, request=request)
    return HttpResponse(html)


@login_required
def modulo_control_action(request, modulo_id):
    """Vista para acciones de control via htmx"""
    from datetime import timedelta
    import logging
    
    logger = logging.getLogger(__name__)
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    modulo = get_object_or_404(Modulo, modulo_id=modulo_id)
    accion = request.POST.get('accion')

    if accion == 'reiniciar':
        # Redirigir al nuevo endpoint de reinicio
        return reiniciar_modulo(request, modulo_id)
    
    # Las acciones de encender/apagar ya no están disponibles
    return JsonResponse({
        'error': 'Acción no soportada. Solo está disponible "reiniciar"'
    }, status=400)
    
    # try:
    #     # Verificar que el módulo tiene reset asignado
    #     if not modulo.reset:
    #         logger.warning(f"⚠️ Módulo {modulo_id} no tiene ControlReinicio asignado")
    #         # Opcional: crear uno automáticamente
    #         reset = ControlReinicio.objects.create(
    #             nombre=f"Reset_{modulo.nombre}",
    #             modulo=modulo,
    #             estado=False
    #         )
    #         modulo.reset = reset
    #         modulo.save()
    #     else:
    #         reset = modulo.reset
        
    #     # Actualizar el estado según la acción
    #     if accion == 'encender':
    #         reset.estado = True
    #         reset.save()
    #         # TODO: Descomentar cuando tengas MQTT configurado
    #         # from mqtt_handler.client import mqtt_client
    #         # mqtt_client.publish(f"modulos/{modulo_id}/control", "ON")
    #         logger.info(f"✅ Módulo {modulo_id} ENCENDIDO")
            
    #     elif accion == 'apagar':
    #         reset.estado = False
    #         reset.save()
    #         # TODO: Descomentar cuando tengas MQTT configurado
    #         # from mqtt_handler.client import mqtt_client
    #         # mqtt_client.publish(f"modulos/{modulo_id}/control", "OFF")
    #         logger.info(f"🔴 Módulo {modulo_id} APAGADO")
            
    #     elif accion == 'reiniciar':
    #         # TODO: Lógica de reinicio
    #         # from mqtt_handler.client import mqtt_client
    #         # mqtt_client.publish(f"modulos/{modulo_id}/control", "RESTART")
    #         logger.info(f"🔄 Módulo {modulo_id} REINICIADO")
        
    #     # Preparar el context para devolver el card actualizado
    #     ultima_medicion = modulo.mediciones.first()
        
    #     # Determinar estado del módulo
    #     if ultima_medicion:
    #         hace_5_min = timezone.now() - timedelta(minutes=5)
    #         hace_15_min = timezone.now() - timedelta(minutes=15)
            
    #         if ultima_medicion.fecha >= hace_5_min:
    #             estado = 'online'
    #         elif ultima_medicion.fecha >= hace_15_min:
    #             estado = 'warning'
    #         else:
    #             estado = 'offline'
    #     else:
    #         estado = 'offline'
        
    #     # Agregar propiedades al módulo para el template
    #     modulo.estado = estado
    #     modulo.temperatura = float(ultima_medicion.valor_temp) if ultima_medicion and ultima_medicion.valor_temp else 0
    #     modulo.presion = float(ultima_medicion.valor_press) if ultima_medicion and ultima_medicion.valor_press else 0
    #     modulo.ultima_medicion = ultima_medicion.fecha if ultima_medicion else None
        
    #     # Estados UP/DOWN
    #     modulo.estado_up = 'correcto'
    #     modulo.estado_down = 'correcto'
        
    #     # Renderizar el card completo actualizado
    #     context = {
    #         'modulo': modulo,
    #     }
        
    #     html = render_to_string('modulos/partials/modulo_card.html', context, request=request)
    #     return HttpResponse(html)
        
    # except Exception as e:
    #     logger.error(f"❌ Error en modulo_control_action: {e}")
    #     import traceback
    #     logger.error(traceback.format_exc())
    #     return HttpResponse(
    #         '<div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">Error al procesar la acción</div>',
    #         status=500
    #     )


@login_required
def ultima_medicion_partial(request, modulo_id):
    """Vista parcial para actualizar última medición"""
    modulo = get_object_or_404(Modulo, modulo_id=modulo_id)
    ultima_medicion = modulo.mediciones.first()
    
    context = {
        'modulo': modulo,
        'ultima_medicion': ultima_medicion
    }
    
    html = render_to_string('modulos/partials/ultima_medicion.html', context, request=request)
    return HttpResponse(html)

@login_required
def reiniciar_todos_modulos(request):
    """
    Vista para reiniciar todos los módulos del sistema
    """
    from django.http import JsonResponse
    from django.views.decorators.csrf import csrf_exempt
    import json
    
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)
    
    try:
        # Obtener todos los módulos
        modulos = Modulo.objects.all()
        total_modulos = modulos.count()
        
        # Contador de éxitos
        reiniciados = 0
        errores = 0
        
        # Reiniciar cada módulo
        for modulo in modulos:
            try:
                # Aquí iría la lógica real de MQTT para reiniciar
                # Ejemplo: mqtt_client.publish(f"modulos/{modulo.modulo_id}/control", "RESET")
                
                # Por ahora, simulamos el reinicio
                # En producción, deberías publicar al broker MQTT
                reiniciados += 1
                
                # Opcional: Registrar en log de reinicios
                if hasattr(modulo, 'reset'):
                    LogReinicio.objects.create(
                        reset=modulo.reset,
                        reinicio=True,
                        fecha=timezone.now()
                    )
                
            except Exception as e:
                print(f"Error reiniciando módulo {modulo.modulo_id}: {str(e)}")
                errores += 1
        
        # Respuesta exitosa
        mensaje = f"Comando de reinicio enviado a {reiniciados} de {total_modulos} módulos"
        if errores > 0:
            mensaje += f" ({errores} errores)"
        
        return JsonResponse({
            'success': True,
            'message': mensaje,
            'total': total_modulos,
            'reiniciados': reiniciados,
            'errores': errores
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Error al reiniciar módulos: {str(e)}'
        }, status=500)

@login_required
def obtener_notificaciones(request):
    """
    Obtener notificaciones del usuario actual
    """
    from django.http import JsonResponse
    
    # Obtener solo las no leídas o las últimas 10
    mostrar_todas = request.GET.get('todas', 'false') == 'true'
    
    if mostrar_todas:
        notificaciones = Notificacion.objects.filter(usuario=request.user)[:20]
    else:
        notificaciones = Notificacion.objects.filter(usuario=request.user, leida=False)[:10]
    
    # Serializar notificaciones
    notificaciones_data = []
    for notif in notificaciones:
        notificaciones_data.append({
            'id': notif.notificacion_id,
            'tipo': notif.tipo,
            'categoria': notif.categoria,
            'titulo': notif.titulo,
            'mensaje': notif.mensaje,
            'leida': notif.leida,
            'importante': notif.importante,
            'fecha': notif.fecha_creacion.isoformat(),
            'modulo_id': notif.modulo.modulo_id if notif.modulo else None,
            'modulo_nombre': notif.modulo.nombre if notif.modulo else None,
        })
    
    # Contar no leídas
    no_leidas = Notificacion.objects.filter(usuario=request.user, leida=False).count()
    
    return JsonResponse({
        'notificaciones': notificaciones_data,
        'no_leidas': no_leidas
    })


@login_required
def marcar_notificacion_leida(request, notificacion_id):
    """
    Marcar una notificación como leída
    """
    from django.http import JsonResponse
    from django.shortcuts import get_object_or_404
    
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)
    
    notificacion = get_object_or_404(Notificacion, notificacion_id=notificacion_id, usuario=request.user)
    notificacion.marcar_como_leida()
    
    # Contar no leídas actualizadas
    no_leidas = Notificacion.objects.filter(usuario=request.user, leida=False).count()
    
    return JsonResponse({
        'success': True,
        'no_leidas': no_leidas
    })


@login_required
def marcar_todas_leidas(request):
    """
    Marcar todas las notificaciones como leídas
    """
    from django.http import JsonResponse
    
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)
    
    # Actualizar todas las no leídas
    Notificacion.objects.filter(usuario=request.user, leida=False).update(
        leida=True,
        fecha_leida=timezone.now()
    )
    
    return JsonResponse({
        'success': True,
        'message': 'Todas las notificaciones marcadas como leídas'
    })


@login_required
def eliminar_notificacion(request, notificacion_id):
    """
    Eliminar una notificación
    """
    from django.http import JsonResponse
    from django.shortcuts import get_object_or_404
    
    if request.method != 'DELETE' and request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)
    
    notificacion = get_object_or_404(Notificacion, notificacion_id=notificacion_id, usuario=request.user)
    notificacion.delete()
    
    # Contar no leídas actualizadas
    no_leidas = Notificacion.objects.filter(usuario=request.user, leida=False).count()
    
    return JsonResponse({
        'success': True,
        'no_leidas': no_leidas
    })

@login_required
@csrf_exempt  # ← AGREGAR ESTE DECORADOR
def obtener_notificaciones(request):
    """
    Obtener notificaciones del usuario actual
    """
    # Obtener solo las no leídas o las últimas 10
    mostrar_todas = request.GET.get('todas', 'false') == 'true'
    
    if mostrar_todas:
        notificaciones = Notificacion.objects.filter(usuario=request.user)[:20]
    else:
        notificaciones = Notificacion.objects.filter(usuario=request.user, leida=False)[:10]
    
    # Serializar notificaciones
    notificaciones_data = []
    for notif in notificaciones:
        notificaciones_data.append({
            'id': notif.notificacion_id,
            'tipo': notif.tipo,
            'categoria': notif.categoria,
            'titulo': notif.titulo,
            'mensaje': notif.mensaje,
            'leida': notif.leida,
            'importante': notif.importante,
            'fecha': notif.fecha_creacion.isoformat(),
            'modulo_id': notif.modulo.modulo_id if notif.modulo else None,
            'modulo_nombre': notif.modulo.nombre if notif.modulo else None,
        })
    
    # Contar no leídas
    no_leidas = Notificacion.objects.filter(usuario=request.user, leida=False).count()
    
    return JsonResponse({
        'notificaciones': notificaciones_data,
        'no_leidas': no_leidas
    })


@login_required
@csrf_exempt  # ← AGREGAR ESTE DECORADOR
def marcar_notificacion_leida(request, notificacion_id):
    """
    Marcar una notificación como leída
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)
    
    notificacion = get_object_or_404(Notificacion, notificacion_id=notificacion_id, usuario=request.user)
    notificacion.marcar_como_leida()
    
    # Contar no leídas actualizadas
    no_leidas = Notificacion.objects.filter(usuario=request.user, leida=False).count()
    
    return JsonResponse({
        'success': True,
        'no_leidas': no_leidas
    })


@login_required
@csrf_exempt  # ← AGREGAR ESTE DECORADOR
def marcar_todas_leidas(request):
    """
    Marcar todas las notificaciones como leídas
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)
    
    # Actualizar todas las no leídas
    Notificacion.objects.filter(usuario=request.user, leida=False).update(
        leida=True,
        fecha_leida=timezone.now()
    )
    
    return JsonResponse({
        'success': True,
        'message': 'Todas las notificaciones marcadas como leídas'
    })


@login_required
@csrf_exempt  # ← AGREGAR ESTE DECORADOR
def eliminar_notificacion(request, notificacion_id):
    """
    Eliminar una notificación
    """
    if request.method != 'DELETE' and request.method != 'POST':
        return JsonResponse({'success': False, 'message': 'Método no permitido'}, status=405)
    
    notificacion = get_object_or_404(Notificacion, notificacion_id=notificacion_id, usuario=request.user)
    notificacion.delete()
    
    # Contar no leídas actualizadas
    no_leidas = Notificacion.objects.filter(usuario=request.user, leida=False).count()
    
    return JsonResponse({
        'success': True,
        'no_leidas': no_leidas
    })

# ============================================================================
# FUNCIONES HELPER PARA CREAR NOTIFICACIONES AUTOMÁTICAS
# ============================================================================

def crear_notificacion_modulo_offline(usuario, modulo):
    """Crear notificación cuando un módulo se desconecta"""
    Notificacion.crear_alerta(
        usuario=usuario,
        modulo=modulo,
        mensaje=f'El módulo {modulo.nombre} está OFFLINE y no responde.',
        importante=True
    )


def crear_notificacion_temperatura_alta(usuario, modulo, temperatura):
    """Crear notificación cuando la temperatura es alta"""
    Notificacion.crear_alerta(
        usuario=usuario,
        modulo=modulo,
        mensaje=f'Temperatura elevada: {temperatura}°C (Límite: {modulo.temp_max}°C)',
        importante=True
    )


def crear_notificacion_reinicio(usuario, modulo):
    """Crear notificación cuando se reinicia un módulo"""
    Notificacion.crear_notificacion_modulo(
        usuario=usuario,
        modulo=modulo,
        tipo='info',
        titulo=f'Módulo reiniciado',
        mensaje=f'El módulo {modulo.nombre} ha sido reiniciado correctamente.',
        importante=False
    )

@login_required
def mediciones_view(request):
    """Vista principal de mediciones agrupadas por ubicación"""
    
    # Obtener el filtro de ubicación desde GET
    ubicacion_seleccionada = request.GET.get('ubicacion', 'todas')
    
    # Obtener todas las ubicaciones disponibles
    ubicaciones_disponibles = Modulo.objects.values_list('ubicacion', flat=True).distinct().order_by('ubicacion')
    
    # Filtrar módulos según la selección
    if ubicacion_seleccionada == 'todas':
        modulos_query = Modulo.objects.all()
    else:
        modulos_query = Modulo.objects.filter(ubicacion=ubicacion_seleccionada)
    
    # Agrupar módulos por ubicación
    ubicaciones_con_datos = {}
    
    for ubicacion in ubicaciones_disponibles:
        if ubicacion_seleccionada != 'todas' and ubicacion != ubicacion_seleccionada:
            continue
            
        # Obtener módulos de esta ubicación
        modulos = modulos_query.filter(ubicacion=ubicacion).prefetch_related('mediciones')
        
        # Calcular promedios de la ubicación (últimas mediciones de cada módulo)
        total_temp = 0
        total_presion = 0
        modulos_con_datos = 0  # Contador de módulos que tienen datos
        
        for modulo in modulos:
            ultima_medicion = modulo.mediciones.first()
            if ultima_medicion and ultima_medicion.valor_temp and ultima_medicion.valor_press:
                try:
                    total_temp += float(ultima_medicion.valor_temp)
                    total_presion += float(ultima_medicion.valor_press)
                    modulos_con_datos += 1
                except (ValueError, TypeError):
                    pass
        
        # Calcular promedio basado en módulos que tienen datos
        temp_promedio = total_temp / modulos_con_datos if modulos_con_datos > 0 else 0
        presion_promedio = total_presion / modulos_con_datos if modulos_con_datos > 0 else 0
        
        # Agregar datos de tendencia a cada módulo
        modulos_con_tendencias = []
        for modulo in modulos:
            ultima_medicion = modulo.mediciones.first()
            modulo.ultima_medicion = ultima_medicion
            
            # Calcular tendencias (comparar últimas 2 mediciones)
            ultimas_mediciones = list(modulo.mediciones.all()[:2])
            
            if len(ultimas_mediciones) == 2:
                try:
                    temp_actual = float(ultimas_mediciones[0].valor_temp or 0)
                    temp_anterior = float(ultimas_mediciones[1].valor_temp or 0)
                    presion_actual = float(ultimas_mediciones[0].valor_press or 0)
                    presion_anterior = float(ultimas_mediciones[1].valor_press or 0)
                    
                    if temp_actual > temp_anterior:
                        modulo.tendencia_temperatura = 'up'
                    elif temp_actual < temp_anterior:
                        modulo.tendencia_temperatura = 'down'
                    else:
                        modulo.tendencia_temperatura = 'stable'
                    
                    if presion_actual > presion_anterior:
                        modulo.tendencia_presion = 'up'
                    elif presion_actual < presion_anterior:
                        modulo.tendencia_presion = 'down'
                    else:
                        modulo.tendencia_presion = 'stable'
                except (ValueError, TypeError):
                    modulo.tendencia_temperatura = 'stable'
                    modulo.tendencia_presion = 'stable'
            else:
                modulo.tendencia_temperatura = 'stable'
                modulo.tendencia_presion = 'stable'
            
            modulos_con_tendencias.append(modulo)
        
        ubicaciones_con_datos[ubicacion] = {
            'nombre': ubicacion,
            'modulos': modulos_con_tendencias,
            'temp_promedio': temp_promedio,
            'presion_promedio': presion_promedio,
        }
    
    context = {
        'ubicaciones_disponibles': ubicaciones_disponibles,
        'ubicaciones_con_datos': ubicaciones_con_datos,
        'ubicacion_seleccionada': ubicacion_seleccionada,
    }
    
    # Si es una petición HTMX, solo devolver el partial
    if request.headers.get('HX-Request'):
        return render(request, 'mediciones/partials/lista_ubicaciones.html', context)
    
    # Si es petición normal, devolver template completo
    return render(request, 'mediciones/mediciones.html', context)

@login_required
def modulo_detail(request, modulo_id):
    """Vista detallada de un módulo con tabs para mediciones, apuntes y logs"""
    from django.shortcuts import get_object_or_404
    from datetime import datetime, timedelta
    from django.db.models import Avg, Max, Min
    import json
    
    # Obtener módulo
    modulo = get_object_or_404(
        Modulo.objects.select_related('reset'),
        modulo_id=modulo_id
    )
    
    # ========================================
    # TAB 1: MEDICIONES
    # ========================================
    
    # Última medición y tendencias
    ultima_medicion = modulo.mediciones.first()
    ultimas_dos = list(modulo.mediciones.all()[:2])
    
    tendencia_temp = 'stable'
    tendencia_presion = 'stable'
    
    if len(ultimas_dos) == 2:
        try:
            temp_actual = float(ultimas_dos[0].valor_temp or 0)
            temp_anterior = float(ultimas_dos[1].valor_temp or 0)
            presion_actual = float(ultimas_dos[0].valor_press or 0)
            presion_anterior = float(ultimas_dos[1].valor_press or 0)
            
            tendencia_temp = 'up' if temp_actual > temp_anterior else ('down' if temp_actual < temp_anterior else 'stable')
            tendencia_presion = 'up' if presion_actual > presion_anterior else ('down' if presion_actual < presion_anterior else 'stable')
        except (ValueError, TypeError):
            pass
    
    # Últimas 10 mediciones para la tabla
    ultimas_mediciones = modulo.mediciones.all()[:10]
    
    # Mediciones de las últimas 24 horas para gráfico y estadísticas
    hace_24h = datetime.now() - timedelta(hours=24)
    mediciones_24h = modulo.mediciones.filter(fecha__gte=hace_24h).order_by('fecha')
    
    # Calcular estadísticas
    stats_24h = mediciones_24h.aggregate(
        temp_promedio=Avg('valor_temp'),
        temp_max=Max('valor_temp'),
        temp_min=Min('valor_temp')
    )
    
    # Mediciones de ayer para comparativa
    hace_48h = datetime.now() - timedelta(hours=48)
    mediciones_ayer = modulo.mediciones.filter(
        fecha__gte=hace_48h,
        fecha__lt=hace_24h
    )
    
    temp_promedio_ayer = mediciones_ayer.aggregate(Avg('valor_temp'))['valor_temp__avg'] or 0
    diferencia_ayer = (stats_24h['temp_promedio'] or 0) - temp_promedio_ayer
    
    stats_mediciones = {
        'temp_promedio_24h': stats_24h['temp_promedio'] or 0,
        'temp_max_dia': stats_24h['temp_max'] or 0,
        'temp_min_dia': stats_24h['temp_min'] or 0,
        'diferencia_ayer': diferencia_ayer,
    }
    
    # Preparar datos para gráfico Chart.js
    chart_labels = []
    chart_temp_data = []
    chart_presion_data = []
    
    for medicion in mediciones_24h:
        chart_labels.append(medicion.fecha.strftime('%H:%M'))
        try:
            chart_temp_data.append(float(medicion.valor_temp or 0))
            chart_presion_data.append(float(medicion.valor_press or 0))
        except (ValueError, TypeError):
            chart_temp_data.append(None)
            chart_presion_data.append(None)
    
    # ========================================
    # TAB 2: APUNTES/NOTAS
    # ========================================
    
    # Últimos 20 apuntes
    historial_apuntes = modulo.apuntes.all()[:20]
    
    # Calcular cambios entre apuntes consecutivos
    apuntes_con_cambios = []
    for i, apunte in enumerate(historial_apuntes):
        if i < len(historial_apuntes) - 1:
            apunte_anterior = historial_apuntes[i + 1]
            apunte.cambio_up = float(apunte.valor_up) - float(apunte_anterior.valor_up)
            apunte.cambio_down = float(apunte.valor_down) - float(apunte_anterior.valor_down)
        else:
            apunte.cambio_up = None
            apunte.cambio_down = None
        apuntes_con_cambios.append(apunte)
    
    # Datos para gráfico de apuntes
    apuntes_labels = []
    apuntes_up_data = []
    apuntes_down_data = []
    
    for apunte in reversed(list(historial_apuntes[:10])):
        apuntes_labels.append(apunte.fecha.strftime('%d/%m %H:%M'))
        apuntes_up_data.append(float(apunte.valor_up))
        apuntes_down_data.append(float(apunte.valor_down))
    
    # ========================================
    # TAB 3: LOG DE CAMBIOS
    # ========================================
    
    # Eventos de conexión (últimos 30)
    logs_eventos = modulo.estados_conexion.all()[:30]
    
    # Estadísticas de eventos
    logs_stats = {
        'total': logs_eventos.count(),
        'conexiones': modulo.estados_conexion.filter(
            tipo_evento__in=['ONLINE', 'RECONEXION']
        ).count(),
        'ajustes': 0,  # Aquí podrías agregar un modelo de ajustes
        'alarmas': 0,  # Aquí podrías agregar un modelo de alarmas
    }
    
    # Historial de reinicios (últimos 10)
    if modulo.reset:
        logs_reinicios = modulo.reset.logs.all()[:10]
    else:
        logs_reinicios = []
    
    # ========================================
    # CONTEXTO
    # ========================================
    
    context = {
        'modulo': modulo,
        'ultima_medicion': ultima_medicion,
        'tendencia_temp': tendencia_temp,
        'tendencia_presion': tendencia_presion,
        
        # Tab Mediciones
        'ultimas_mediciones': ultimas_mediciones,
        'stats_mediciones': stats_mediciones,
        'chart_labels': json.dumps(chart_labels),
        'chart_temp_data': json.dumps(chart_temp_data),
        'chart_presion_data': json.dumps(chart_presion_data),
        
        # Tab Apuntes
        'historial_apuntes': apuntes_con_cambios,
        'apuntes_labels': json.dumps(apuntes_labels),
        'apuntes_up_data': json.dumps(apuntes_up_data),
        'apuntes_down_data': json.dumps(apuntes_down_data),
        
        # Tab Logs
        'logs_eventos': logs_eventos,
        'logs_stats': logs_stats,
        'logs_reinicios': logs_reinicios,
    }
    
    return render(request, 'modulos/detalle_tabs.html', context)

@login_required
def modulo_control(request, modulo_id):
    """Panel de control del módulo CON historial"""
    modulo = get_object_or_404(Modulo, modulo_id=modulo_id)
    
    # Obtener últimos 10 eventos para el historial
    logs_eventos = modulo.estados_conexion.all()[:10]
    
    context = {
        'page_title': f'Control - {modulo.nombre}',
        'modulo': modulo,
        'logs_eventos': logs_eventos,  # 🆕 Agregar logs
    }
    
    return render(request, 'modulos/control.html', context)

cooldown_reinicios = {}

@login_required
@csrf_protect
def reiniciar_modulo(request, modulo_id):
    """
    Vista para reiniciar un módulo individual con período de espera
    
    POST /api/modulos/<modulo_id>/reiniciar/
    """
    if request.method != 'POST':
        return JsonResponse({'success': False, 'error': 'Método no permitido'}, status=405)
    
    modulo = get_object_or_404(Modulo, modulo_id=modulo_id)
    
    # Verificar cooldown (30 segundos)
    ahora = timezone.now()
    ultimo_reinicio = cooldown_reinicios.get(modulo_id)
    
    if ultimo_reinicio:
        tiempo_transcurrido = (ahora - ultimo_reinicio).total_seconds()
        if tiempo_transcurrido < 30:
            tiempo_restante = int(30 - tiempo_transcurrido)
            return JsonResponse({
                'success': False,
                'error': f'Debes esperar {tiempo_restante} segundos antes de reiniciar nuevamente',
                'cooldown_restante': tiempo_restante
            }, status=429)
    
    try:
        # ============================================
        # LÓGICA DE REINICIO MQTT
        # ============================================
        # Aquí va tu código MQTT para enviar el comando de reinicio
        # Ejemplo:
        # mqtt_client.publish(f"modulos/{modulo_id}/control/reset", "1")
        
        # Por ahora solo simulamos el reinicio
        print(f"[REINICIO] Módulo {modulo_id} - {modulo.nombre} reiniciado en {ahora}")
        
        # Registrar en log de reinicios (si tienes el modelo)
        if hasattr(modulo, 'reset') and modulo.reset:
            LogReinicio.objects.create(
                reset=modulo.reset,
                reinicio=True,
                fecha=ahora
            )
        
        # Actualizar el cooldown
        cooldown_reinicios[modulo_id] = ahora
        
        return JsonResponse({
            'success': True,
            'mensaje': f'Módulo {modulo.nombre} reiniciado exitosamente',
            'modulo_id': modulo_id,
            'timestamp': ahora.isoformat(),
            'cooldown_segundos': 30
        })
        
    except Exception as e:
        print(f"[ERROR] Reinicio módulo {modulo_id}: {str(e)}")
        return JsonResponse({
            'success': False,
            'error': f'Error al reiniciar el módulo: {str(e)}'
        }, status=500)

@login_required
def apuntes_view(request):
    """Vista principal de apuntes agrupados por ubicación"""
    from django.db.models import Avg
    
    # Obtener el filtro de ubicación desde GET
    ubicacion_seleccionada = request.GET.get('ubicacion', 'todas')
    
    # Normalizar ubicación: convertir primera letra a mayúscula
    if ubicacion_seleccionada != 'todas':
        ubicacion_seleccionada = ubicacion_seleccionada.capitalize()  # "norte" → "Norte"
    
    # Obtener todas las ubicaciones disponibles
    ubicaciones_disponibles = Modulo.objects.values_list('ubicacion', flat=True).distinct().order_by('ubicacion')
    
    # Filtrar módulos según la selección
    if ubicacion_seleccionada == 'todas':
        modulos_query = Modulo.objects.all()
    else:
        modulos_query = Modulo.objects.filter(ubicacion=ubicacion_seleccionada)
    
    # Agrupar módulos por ubicación
    ubicaciones_con_datos = {}
    
    for ubicacion in ubicaciones_disponibles:
        if ubicacion_seleccionada != 'todas' and ubicacion != ubicacion_seleccionada:
            continue
            
        # Obtener módulos de esta ubicación
        modulos = modulos_query.filter(ubicacion=ubicacion).prefetch_related('apuntes')
        
        # Calcular promedios de la ubicación (últimos apuntes de cada módulo)
        total_up = 0
        total_down = 0
        modulos_con_datos = 0
        
        for modulo in modulos:
            ultimo_apunte = modulo.apuntes.first()
            if ultimo_apunte:
                try:
                    total_up += float(ultimo_apunte.valor_up)
                    total_down += float(ultimo_apunte.valor_down)
                    modulos_con_datos += 1
                except (ValueError, TypeError):
                    pass
        
        # Calcular promedio
        up_promedio = total_up / modulos_con_datos if modulos_con_datos > 0 else 0
        down_promedio = total_down / modulos_con_datos if modulos_con_datos > 0 else 0
        
        # Agregar datos de tendencia a cada módulo
        modulos_con_tendencias = []
        for modulo in modulos:
            ultimo_apunte = modulo.apuntes.first()
            modulo.ultimo_apunte = ultimo_apunte
            
            # Calcular tendencia (comparar con apunte anterior)
            apuntes_recientes = list(modulo.apuntes.all()[:2])
            if len(apuntes_recientes) == 2:
                try:
                    up_actual = float(apuntes_recientes[0].valor_up)
                    up_anterior = float(apuntes_recientes[1].valor_up)
                    down_actual = float(apuntes_recientes[0].valor_down)
                    down_anterior = float(apuntes_recientes[1].valor_down)
                    
                    modulo.tendencia_up = 'up' if up_actual > up_anterior else ('down' if up_actual < up_anterior else 'stable')
                    modulo.tendencia_down = 'up' if down_actual > down_anterior else ('down' if down_actual < down_anterior else 'stable')
                except (ValueError, TypeError):
                    modulo.tendencia_up = 'stable'
                    modulo.tendencia_down = 'stable'
            else:
                modulo.tendencia_up = 'stable'
                modulo.tendencia_down = 'stable'
            
            modulos_con_tendencias.append(modulo)
        
        ubicaciones_con_datos[ubicacion] = {
            'modulos': modulos_con_tendencias,
            'up_promedio': up_promedio,
            'down_promedio': down_promedio,
            'total_modulos': modulos_con_datos,
        }
    
    context = {
        'page_title': 'Apuntes de Módulos',
        'ubicaciones_con_datos': ubicaciones_con_datos,
        'ubicaciones_disponibles': ubicaciones_disponibles,
        'ubicacion_seleccionada': ubicacion_seleccionada,
    }
    
    # Si es petición HTMX, devolver solo partial
    if request.headers.get('HX-Request'):
        return render(request, 'apuntes/apuntes_partial.html', context)
    
    # Si no, devolver template completo
    return render(request, 'apuntes/apuntes.html', context)