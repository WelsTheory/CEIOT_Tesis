from django.urls import path
from . import views

urlpatterns = [
    # APIs REST (existentes)
    path('login/', views.login, name='api_login'),
    path('user/', views.user_info, name='api_user_info'),
]