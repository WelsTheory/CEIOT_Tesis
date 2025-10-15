# config/urls.py

from django.contrib import admin
from django.urls import path, include
from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # APIs de módulos
    path('api/', include('modulos.urls')),
    
    # Autenticación
    path('api/', include('authentication.urls')),
    
    # Token refresh (JWT estándar)
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]