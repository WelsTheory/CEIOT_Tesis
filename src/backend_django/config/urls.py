# src/backend_django/config/urls.py

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
    # VISTAS DE TEMPLATES
    # ============================================================================
    path('', modulos_views.dashboard_test, name='dashboard'),
    path('test/', modulos_views.test_base_template, name='test_base'),
    path('test/htmx/', modulos_views.test_htmx, name='test_htmx'),
    path('search/', modulos_views.modulo_search, name='modulo_search'),
]

# Servir archivos estáticos en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)