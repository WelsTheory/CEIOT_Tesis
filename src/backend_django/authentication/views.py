from django.shortcuts import render, redirect
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.http import require_http_methods
from django.views.decorators.cache import never_cache
from django.views.decorators.csrf import csrf_protect

# Para las APIs REST (mantener lo existente)
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken


# ============================================================================
# VISTAS DE TEMPLATES (NUEVAS - AGREGAR AL FINAL)
# ============================================================================

@never_cache
@csrf_protect
@require_http_methods(["GET", "POST"])
def login_view(request):
    """
    Vista de login para templates
    GET: Muestra el formulario de login
    POST: Procesa el login
    """
    # Si ya está autenticado, redirigir al dashboard
    if request.user.is_authenticated:
        return redirect('dashboard')
    
    if request.method == 'POST':
        username = request.POST.get('username')
        password = request.POST.get('password')
        remember = request.POST.get('remember')
        
        # Validar campos
        if not username or not password:
            messages.error(request, 'Por favor ingresa usuario y contraseña')
            return render(request, 'auth/login.html')
        
        # Autenticar usuario
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            # Login exitoso
            auth_login(request, user)
            
            # Configurar sesión
            if not remember:
                # Si no marcó "recordarme", la sesión expira al cerrar el navegador
                request.session.set_expiry(0)
            else:
                # Sesión de 30 días
                request.session.set_expiry(2592000)  # 30 días en segundos
            
            # Mensaje de éxito
            messages.success(request, f'¡Bienvenido {user.get_full_name() or user.username}!')
            
            # Redirigir a la página solicitada o al dashboard
            next_url = request.GET.get('next', 'dashboard')
            return redirect(next_url)
        else:
            # Login fallido
            messages.error(request, 'Usuario o contraseña incorrectos')
            return render(request, 'auth/login.html')
    
    # GET: Mostrar formulario
    return render(request, 'auth/login.html')


@login_required
@never_cache
@require_http_methods(["GET", "POST"])
def logout_view(request):
    """
    Vista de logout para templates
    GET: Muestra confirmación de logout
    POST: Cierra la sesión
    """
    if request.method == 'POST':
        username = request.user.username
        auth_logout(request)
        messages.success(request, f'Hasta pronto, {username}!')
        return redirect('login')
    
    # GET: Mostrar confirmación
    return render(request, 'auth/logout.html')


@login_required
def profile_view(request):
    """Vista del perfil del usuario"""
    context = {
        'user': request.user,
        'page_title': 'Mi Perfil'
    }
    return render(request, 'auth/profile.html', context)


# ============================================================================
# VISTAS DE API REST (MANTENER LAS EXISTENTES)
# ============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    API de login con JWT
    POST /api/login/
    Body: {"username": "...", "password": "..."}
    """
    username = request.data.get('username')
    password = request.data.get('password')
    
    if not username or not password:
        return Response(
            {'error': 'Username and password are required'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    user = authenticate(username=username, password=password)
    
    if user is not None:
        # Generar tokens JWT
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'refresh': str(refresh),
            'access': str(refresh.access_token),
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
            }
        })
    else:
        return Response(
            {'error': 'Invalid credentials'},
            status=status.HTTP_401_UNAUTHORIZED
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_info(request):
    """
    API para obtener información del usuario actual
    GET /api/user/
    """
    user = request.user
    return Response({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'first_name': user.first_name,
        'last_name': user.last_name,
        'is_staff': user.is_staff,
        'is_superuser': user.is_superuser,
    })