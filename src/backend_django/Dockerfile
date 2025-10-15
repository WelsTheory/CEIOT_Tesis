FROM python:3.9-slim

# Variables de entorno para Python
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# Establecer directorio de trabajo
WORKDIR /app

# Instalar dependencias del sistema necesarias para mysqlclient
RUN apt-get update && apt-get install -y \
    default-libmysqlclient-dev \
    build-essential \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copiar archivos de requerimientos
COPY requirements.txt .

# Instalar dependencias de Python
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copiar el código del proyecto
COPY . .

# Crear directorios necesarios
RUN mkdir -p staticfiles media

# Exponer puerto
EXPOSE 8000

# Script de inicio que espera a MySQL y luego inicia el servidor
CMD ["sh", "-c", "\
    echo 'Esperando a que MySQL esté listo...' && \
    sleep 10 && \
    echo 'Ejecutando migraciones...' && \
    python manage.py migrate --noinput && \
    echo 'Recolectando archivos estáticos...' && \
    python manage.py collectstatic --noinput && \
    echo 'Iniciando servidor Django...' && \
    python manage.py runserver 0.0.0.0:8000 \
"]