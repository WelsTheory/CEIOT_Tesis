# modulos/views.py

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Max, Avg, Count, Q
from datetime import datetime, timedelta
from django.contrib.auth.decorators import login_required  

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
                'moduloId': modulo.modulo_id,
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
                'moduloId': modulo.modulo_id,
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

def modulo_search(request):
    """Búsqueda de módulos (simulada)"""
    query = request.GET.get('q', '')
    modulos = [
        {'id': 1, 'nombre': 'Módulo 1', 'ubicacion': 'Norte'},
        {'id': 2, 'nombre': 'Módulo 2', 'ubicacion': 'Sur'},
        {'id': 3, 'nombre': 'Módulo 3', 'ubicacion': 'Este'},
        {'id': 4, 'nombre': 'Módulo 4', 'ubicacion': 'Oeste'},
    ]
    if query:
        modulos = [m for m in modulos if query.lower() in m['nombre'].lower()]
    return render(request, 'test/search_results.html', {'modulos': modulos})

@login_required
def dashboard_test(request):
    """Dashboard de prueba"""
    context = {
        'page_title': 'Dashboard - Prueba',
        'modulos': [
            {
                'id': 1, 'nombre': 'Módulo 1', 'ubicacion': 'Norte',
                'estado': 'online', 'temperatura': 25.5, 'presion': 1013.2,
                'up': 1.5, 'down': 0.5
            },
            {
                'id': 2, 'nombre': 'Módulo 2', 'ubicacion': 'Sur',
                'estado': 'online', 'temperatura': 26.8, 'presion': 1012.8,
                'up': 2.0, 'down': 1.0
            },
            {
                'id': 3, 'nombre': 'Módulo 3', 'ubicacion': 'Este',
                'estado': 'warning', 'temperatura': 28.2, 'presion': 1010.5,
                'up': 3.5, 'down': 0.0
            },
            {
                'id': 4, 'nombre': 'Módulo 4', 'ubicacion': 'Oeste',
                'estado': 'offline', 'temperatura': 0, 'presion': 0,
                'up': 0.0, 'down': 3.5
            },
        ],
        'stats': {'total': 64, 'activos': 58, 'alertas': 4, 'desconectados': 2}
    }
    return render(request, 'test/dashboard_test.html', context)