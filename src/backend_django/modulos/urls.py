# modulos/urls.py

from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ModuloViewSet, MedicionViewSet, BeamViewSet,
    ControlReinicioViewSet, EstadoConexionViewSet,
    InfoModuloViewSet, LogReinicioViewSet
)

# Crear router para las APIs REST
router = DefaultRouter()
router.register(r'modulos', ModuloViewSet, basename='modulo')
router.register(r'mediciones', MedicionViewSet, basename='medicion')
router.register(r'apuntes', BeamViewSet, basename='beam')
router.register(r'controles-reinicio', ControlReinicioViewSet, basename='control-reinicio')
router.register(r'estados-conexion', EstadoConexionViewSet, basename='estado-conexion')
router.register(r'info-modulos', InfoModuloViewSet, basename='info-modulo')
router.register(r'logs-reinicios', LogReinicioViewSet, basename='log-reinicio')

urlpatterns = [
    path('', include(router.urls)),
]