#!/bin/bash

echo "🚀 Iniciando despliegue en Lightsail..."

# Detener contenedores
docker-compose -f docker-compose.prod.yml down

# Limpiar imágenes antiguas
docker system prune -f

# Construir y levantar
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

echo "✅ Despliegue completado"
echo "🌐 Frontend: http://52.0.242.44"
echo "🔧 API: http://52.0.242.44:8000"
echo "📊 PHPMyAdmin: http://52.0.242.44:8001"