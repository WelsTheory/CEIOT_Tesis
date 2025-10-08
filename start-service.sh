#!/bin/bash
echo " Iniciando servicios en orden correcto..."
# Detener todo primero
echo " Deteniendo servicios..." 
docker-compose down
# Limpiar red
echo " Limpiando red de Docker..." 
docker network prune -f
# 1. Iniciar MySQL primero
echo " Iniciando MySQL..." 
docker-compose up -d mysql-server 
echo " Esperando a que MySQL esté listo..." 
sleep 20
# Verificar MySQL
until docker exec mysql-server mysqladmin ping -h localhost -u root -puserpass --silent; do 
  echo " MySQL aún no está listo, esperando..." 
  sleep 5
done 
echo " MySQL está listo"
# 2. Iniciar Mosquitto
echo " Iniciando Mosquitto..." 
docker-compose up -d mosquitto 
echo " Esperando a que Mosquitto esté listo..." 
sleep 15
# Verificar Mosquitto
docker exec mosquitto netstat -tulpn | grep 1883 || echo "⚠️ Puerto 1883 aún no disponible" 
echo "Mosquitto está listo"
# 3. Iniciar Backend
echo " Iniciando Backend..." 
docker-compose up -d node-backend 
sleep 10 
echo " Backend iniciado"
# 4. Iniciar Frontend
echo " Iniciando Frontend..." 
docker-compose up -d ionic-ui 
sleep 5 
echo " Frontend iniciado"
# 5. Iniciar servicios adicionales
echo " Iniciando servicios adicionales..." 
docker-compose up -d mysql-admin nginx 
echo "" 
echo " Todos los servicios iniciados correctamente" 
echo "" 
echo " Estado de contenedores:" 
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" 
echo "" 
echo " URLs disponibles:" 
echo " Frontend: http://52.0.242.44" 
echo " API: http://52.0.242.44/api" 
echo " PHPMyAdmin: http://52.0.242.44/phpmyadmin" 
echo ""
echo " Ver logs: docker-compose logs -f node-backend"
