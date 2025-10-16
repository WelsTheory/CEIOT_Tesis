from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from rest_framework_simplejwt.views import TokenRefreshView

# Importar vistas
from modulos import views as modulos_views
from authentication import views as auth_views

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # ============================================================================
    # APIs REST
    # ============================================================================
    path('api/', include('modulos.urls')),
    path('api/', include('authentication.urls')),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # ============================================================================
    # AUTENTICACIÓN (Templates)
    # ============================================================================
    path('login/', auth_views.login_view, name='login'),
    path('logout/', auth_views.logout_view, name='logout'),
    path('profile/', auth_views.profile_view, name='profile'),
    
    # ============================================================================
    # VISTAS PRINCIPALES (Etapa 3)
    # ============================================================================
    # Dashboard
    path('', modulos_views.dashboard, name='dashboard'),
    
    # Módulos
    path('modulos/', modulos_views.modulos_list, name='modulos_list'),
    path('modulos/<int:modulo_id>/', modulos_views.modulo_detail, name='modulo_detail'),
    path('modulos/<int:modulo_id>/mediciones/', modulos_views.modulo_mediciones, name='modulo_mediciones'),
    path('modulos/<int:modulo_id>/control/', modulos_views.modulo_control, name='modulo_control'),
    
    # ============================================================================
    # VISTAS DE PRUEBA (mantener para referencia)
    # ============================================================================
    path('test/', modulos_views.test_base_template, name='test_base'),
    path('test/htmx/', modulos_views.test_htmx, name='test_htmx'),
    path('search/', modulos_views.modulo_search, name='modulo_search'),
    # ============================================================================
    # ENDPOINTS HTMX (Etapa 4)
    # ============================================================================
    # Partials para auto-refresh
    path('api/dashboard/stats/', modulos_views.dashboard_stats_partial, name='dashboard_stats_partial'),
    path('api/modulos/<int:modulo_id>/card/', modulos_views.modulo_card_partial, name='modulo_card_partial'),
    path('api/modulos/<int:modulo_id>/ultima-medicion/', modulos_views.ultima_medicion_partial, name='ultima_medicion_partial'),
    
    # Acciones de control
    path('api/modulos/<int:modulo_id>/control-action/', modulos_views.modulo_control_action, name='modulo_control_action'),
]

# Servir archivos estáticos en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)