# authentication/urls.py

from django.urls import path
from .views import login, user_info

urlpatterns = [
    path('login/', login, name='login'),
    path('user/', user_info, name='user_info'),
]