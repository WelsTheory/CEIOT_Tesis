#!/bin/bash
# src/backend_django/start.sh

echo "🚀 Iniciando Backend Django..."

# Esperar a que MySQL esté disponible
echo "⏳ Esperando a MySQL..."
while ! nc -z mysql-server 3306; do
  sleep 1
done
echo "✅ MySQL está listo"

# Esperar a que Mosquitto esté disponible
echo "⏳ Esperando a Mosquitto MQTT..."
while ! nc -z mosquitto 1883; do
  sleep 1
done
echo "✅ Mosquitto está listo"

# Ejecutar migraciones
echo "🔄 Ejecutando migraciones..."
python manage.py migrate --noinput

# Crear superusuario si no existe
echo "👤 Verificando superusuario..."
python manage.py shell << END
from django.contrib.auth import get_user_model
User = get_user_model()
if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin')
    print('Superusuario creado: admin/admin')
else:
    print('Superusuario ya existe')
END

# Recolectar archivos estáticos
echo "📦 Recolectando archivos estáticos..."
python manage.py collectstatic --noinput

# Iniciar servidor Django
echo "✅ Iniciando servidor Django en puerto 8000..."
python manage.py runserver 0.0.0.0:8000