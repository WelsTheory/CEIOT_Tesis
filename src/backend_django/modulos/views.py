# modulos/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Max, Avg, Count, Q
from datetime import datetime, timedelta
from django.utils import timezone
from django.contrib.auth.decorators import login_required  
from django.shortcuts import render, get_object_or_404, redirect  # ← Agregar redirect
from django.http import HttpResponse
from django.template.loader import render_to_string

from .models import (
    Modulo, Medicion, Beam, ControlReinicio,
    EstadoConexion, InfoModulo, LogReinicio
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
    """Dashboard principal con datos reales de la BD"""
    from django.db.models import Count, Q, Avg, Max
    from datetime import datetime, timedelta
    
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
    for modulo in modulos:
        # Última medición
        ultima_medicion = modulo.mediciones.first()  # Ya ordenado por -fecha
        
        # Determinar estado
        if ultima_medicion:
            # Módulo tiene mediciones recientes
            tiempo_desde_medicion = datetime.now() - ultima_medicion.fecha.replace(tzinfo=None)
            if tiempo_desde_medicion.total_seconds() < 300:  # 5 minutos
                estado = 'online'
            elif tiempo_desde_medicion.total_seconds() < 900:  # 15 minutos
                estado = 'warning'
            else:
                estado = 'offline'
        else:
            estado = 'offline'
        
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
        })
    
    # ORDENAMIENTO: Primero por ubicación (Norte, Este, Oeste, Sur), luego por nombre
    # Función para extraer el número del nombre del módulo para ordenamiento numérico
    def extraer_numero(nombre):
        import re
        # Buscar el primer número en el nombre
        match = re.search(r'\d+', nombre)
        return int(match.group()) if match else 0
    
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
    
    context = {
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
    stats = modulo.mediciones.aggregate(
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
        'stats': stats,
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
    from django.http import JsonResponse
    
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    modulo = get_object_or_404(Modulo, modulo_id=modulo_id)
    accion = request.POST.get('accion')
    
    # Aquí iría la lógica MQTT real
    # mqtt_client.publish(f"modulos/{modulo_id}/control", accion.upper())
    
    mensajes = {
        'encender': f'✅ Módulo {modulo.nombre} encendido',
        'apagar': f'🔴 Módulo {modulo.nombre} apagado',
        'reiniciar': f'🔄 Módulo {modulo.nombre} reiniciado'
    }
    
    mensaje = mensajes.get(accion, 'Acción realizada')
    
    # Devolver HTML con mensaje
    html = f'''
    <div class="bg-green-50 border border-green-200 rounded-lg p-4 mb-4" 
         x-data="{{ show: true }}" 
         x-show="show"
         x-init="setTimeout(() => show = false, 3000)">
        <div class="flex items-center">
            <i class="fas fa-check-circle text-green-600 text-xl mr-3"></i>
            <span class="text-green-800">{mensaje}</span>
        </div>
    </div>
    '''
    
    return HttpResponse(html)


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