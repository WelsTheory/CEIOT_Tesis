//=======[ Settings, Imports & Data ]==========================================
var PORT = 3000;

// Importación de librerías necesarias
var express = require('express');
var cors = require('cors');
const jwt = require('jsonwebtoken');
var pool = require('./mysql-connector');
const mqtt = require('mqtt'); // ← Nueva importación MQTT

// Importación de rutas personalizadas para modulos
const routerModulos = require('./modulos/index');

// Inicialización de la aplicación Express
var app = express();

//=======[ MQTT Configuration ]=============================================
//const MQTT_BROKER_URL = 'mqtt://mosquitto:1883'; // ← Usar nombre del contenedor Docker
const MQTT_BROKER_URL = 'mqtt://10.10.10.102:1883'; // BROQUET MQTT REMOTO
const MQTT_TOPICS = {
    SENSOR_DATA: 'sensores/data',
    CONTROL_COMMANDS: 'control/commands',
    DEVICE_STATUS: 'dispositivos/estado',
    MEASUREMENTS: 'mediciones/nuevas',
    APUNTE_DATA: 'apunte/data'  // ← Nuevo topic para apuntes
};

// Crear cliente MQTT con reintentos
let mqttClient = null;
let mqttConnected = false;

function connectMQTT() {
    console.log('🔌 Intentando conectar a MQTT...');
    
    mqttClient = mqtt.connect(MQTT_BROKER_URL, {
        clientId: 'backend_server_' + Math.random().toString(16).substr(2, 8),
        reconnectPeriod: 5000,
        keepalive: 60,
        clean: true
    });

    // Eventos del cliente MQTT
    mqttClient.on('connect', function () {
        console.log('✅ Conectado al broker MQTT:', MQTT_BROKER_URL);
        mqttConnected = true;
        
        // Suscribirse a topics relevantes
        mqttClient.subscribe(MQTT_TOPICS.SENSOR_DATA, (err) => {
            if (!err) {
                console.log('📡 Suscrito a:', MQTT_TOPICS.SENSOR_DATA);
            }
        });
        
        mqttClient.subscribe(MQTT_TOPICS.DEVICE_STATUS, (err) => {
            if (!err) {
                console.log('📡 Suscrito a:', MQTT_TOPICS.DEVICE_STATUS);
            }
        });
        
        // Suscribirse al nuevo topic de apuntes
        mqttClient.subscribe(MQTT_TOPICS.APUNTE_DATA, (err) => {
            if (!err) {
                console.log('📡 Suscrito a:', MQTT_TOPICS.APUNTE_DATA);
            }
        });
    });

    mqttClient.on('message', function (topic, message) {
        console.log('📨 Mensaje MQTT recibido:');
        console.log('  Topic:', topic);
        console.log('  Mensaje:', message.toString());
        
        try {
            const data = JSON.parse(message.toString());
            
            // Procesar según el topic
            switch(topic) {
                case MQTT_TOPICS.SENSOR_DATA:
                    handleSensorData(data);
                    break;
                case MQTT_TOPICS.DEVICE_STATUS:
                    handleDeviceStatus(data);
                    break;
                case MQTT_TOPICS.APUNTE_DATA:
                    handleApunteData(data);  // ← Nuevo handler
                    break;
            }
        } catch (error) {
            console.error('Error procesando mensaje MQTT:', error);
        }
    });

    mqttClient.on('error', function (error) {
        console.error('❌ Error MQTT:', error.message);
        mqttConnected = false;
    });

    mqttClient.on('close', function () {
        console.log('🔌 Conexión MQTT cerrada');
        mqttConnected = false;
    });

    mqttClient.on('reconnect', function () {
        console.log('🔄 Reintentando conexión MQTT...');
    });
}

//=======[ MQTT Message Handlers ]==========================================
function handleSensorData(data) {
    console.log('🌡️ Procesando datos de sensor:', data);
    
    // Ejemplo: Guardar medición en BD si viene con el formato correcto
    if (data.moduloId && (data.temperatura !== undefined || data.valor !== undefined)) {
        // Adaptarse al formato de tu BD actual
        const valor = data.temperatura || data.valor_temp || data.valor;
        const presion = data.presion || data.valor_press || null;
        
        let query, params;
        
        if (presion !== null) {
            // Si tu tabla tiene columnas separadas para temp y presión
            query = `INSERT INTO Mediciones (moduloId, fecha, valor_temp, valor_press) VALUES (?, NOW(), ?, ?)`;
            params = [data.moduloId, valor, presion];
        } else {
            // Si tu tabla tiene una sola columna 'valor'
            query = `INSERT INTO Mediciones (moduloId, fecha, valor) VALUES (?, NOW(), ?)`;
            params = [data.moduloId, valor];
        }
        
        pool.query(query, params, (error) => {
            if (error) {
                console.error('❌ Error guardando medición MQTT:', error);
            } else {
                console.log('✅ Medición MQTT guardada en BD');
                
                // Publicar confirmación si MQTT está conectado
                if (mqttConnected && mqttClient) {
                    mqttClient.publish(MQTT_TOPICS.MEASUREMENTS, JSON.stringify({
                        status: 'saved',
                        moduloId: data.moduloId,
                        timestamp: new Date().toISOString()
                    }));
                }
            }
        });
    }
}

function handleDeviceStatus(data) {
    console.log('📡 Estado del dispositivo actualizado:', data);
    // Aquí puedes manejar cambios de estado de dispositivos
}

function handleApunteData(data) {
    console.log('🎯 Procesando datos de apunte:', data);
    
    // Validar que tenga los datos necesarios
    if (data.moduloId && (data.up !== undefined || data.down !== undefined)) {
        const moduloId = parseInt(data.moduloId);
        
        // PASO 1: Actualizar tabla Modulos (valores por defecto)
        let updateFields = [];
        let params = [];
        
        if (data.up !== undefined) {
            updateFields.push('up = ?');
            params.push(parseFloat(data.up));
        }
        
        if (data.down !== undefined) {
            updateFields.push('down = ?');
            params.push(parseFloat(data.down));
        }
        
        params.push(moduloId);
        const queryModulos = `UPDATE Modulos SET ${updateFields.join(', ')} WHERE moduloId = ?`;
        
        console.log('📝 Actualizando tabla Modulos:', queryModulos, params);
        
        pool.query(queryModulos, params, (error, result) => {
            if (error) {
                console.error('❌ Error actualizando Modulos:', error);
                return;
            } 
            
            if (result.affectedRows === 0) {
                console.warn('⚠️ No se encontró módulo con ID:', moduloId);
                return;
            }
            
            console.log('✅ Tabla Modulos actualizada para módulo', moduloId);
            
            // PASO 2: Insertar registro histórico en tabla Beam
            const up = data.up !== undefined ? parseFloat(data.up) : null;
            const down = data.down !== undefined ? parseFloat(data.down) : null;
            
            // Si no se proporciona uno de los valores, obtenerlo de la tabla Modulos
            if (up === null || down === null) {
                const queryGetCurrent = `SELECT up, down FROM Modulos WHERE moduloId = ?`;
                
                pool.query(queryGetCurrent, [moduloId], (err, currentResult) => {
                    if (err) {
                        console.error('❌ Error obteniendo valores actuales:', err);
                        return;
                    }
                    
                    if (currentResult.length > 0) {
                        const currentValues = currentResult[0];
                        const finalUp = up !== null ? up : parseFloat(currentValues.up);
                        const finalDown = down !== null ? down : parseFloat(currentValues.down);
                        
                        insertIntoBeam(moduloId, finalUp, finalDown, data);
                    }
                });
            } else {
                insertIntoBeam(moduloId, up, down, data);
            }
        });
    }
}

// Función auxiliar para insertar en tabla Beam
function insertIntoBeam(moduloId, up, down, originalData) {
    const queryBeam = `INSERT INTO Beam (modulo_id, fecha, valor_up, valor_down) VALUES (?, NOW(), ?, ?)`;
    const beamParams = [moduloId, up, down];
    
    console.log('📝 Insertando en tabla Beam:', queryBeam, beamParams);
    
    pool.query(queryBeam, beamParams, (errorBeam, resultBeam) => {
        if (errorBeam) {
            console.error('❌ Error insertando en Beam:', errorBeam);
        } else {
            console.log('✅ Registro insertado en tabla Beam para módulo', moduloId);
            console.log('📊 Datos guardados: UP =', up, ', DOWN =', down);
            
            // PASO 3: Publicar confirmación con ID del registro creado
            if (mqttConnected && mqttClient) {
                const confirmacion = {
                    status: 'updated',
                    moduloId: moduloId,
                    up: up,
                    down: down,
                    beamId: resultBeam.insertId,
                    timestamp: new Date().toISOString(),
                    source: 'mqtt_update'
                };
                
                console.log('📤 Enviando confirmación MQTT:', confirmacion);
                
                mqttClient.publish('apunte/confirmacion', JSON.stringify(confirmacion), (pubError) => {
                    if (pubError) {
                        console.error('❌ Error publicando confirmación:', pubError);
                    } else {
                        console.log('✅ Confirmación MQTT enviada correctamente');
                    }
                });
            }
        }
    });
}
// Configuración de CORS (qué orígenes y métodos están permitidos)
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
    credentials: true
};

// Middlewares globales
app.use(express.json());
app.use(express.static('/home/node/app/static/'));
app.use(cors(corsOptions));

//=======[ KEY & TESTUSER ]======================================================
// Clave secreta usada para firmar y verificar tokens JWT
const YOUR_SECRET_KEY = 'mi llave';
// Usuario de prueba (para login básico)
var testUser = { username: 'test', password: '1234' };

//=======[ Main module code ]==================================================
// Middleware de autenticación basado en JWT
var authenticator = function (req, res, next) {
    // Obtiene la cabecera de autorización
    let autHeader = (req.headers.authorization || '');
    // Verifica si viene con formato Bearer <token>
    if (autHeader.startsWith('Bearer ')) {
        token = autHeader.split(' ')[1];
    } else {
        return res.status(401).send({ message: 'Se requiere un token de tipo Bearer' });
    }
    // Verifica validez del token
    jwt.verify(token, YOUR_SECRET_KEY, function (err) {
        if (err) {
            return res.status(403).send({ message: 'Token inválido' });
        }
        next();
    });
};

//=======[ Generador de Mediciones Aleatorias ]================================
// Función que genera mediciones aleatorias y las guarda en la BD
const generarMediciones = () => {
    console.log('🎲 Generando mediciones aleatorias...');
    // Query para obtener todos los modulos
    const queryModulos = 'SELECT moduloId FROM Modulos';
    
    pool.query(queryModulos, (error, modulos) => {
        if (error) {
            console.error('Error obteniendo módulos:', error);
            return;
        }

        modulos.forEach(modulo => {
            const temperatura = (Math.random() * 30 + 10).toFixed(1); // 10-40°C
            const presion = (Math.random() * 50 + 990).toFixed(1);    // 990-1040 hPa
            
            // Insertar en BD
            const queryInsertMedicion = `
                INSERT INTO Mediciones (moduloId, fecha, valor_temp, valor_press)
                VALUES (?, NOW(), ?, ?)`;
                
            pool.query(queryInsertMedicion, [modulo.moduloId, temperatura, presion], (err) => {
                if (!err) {
                    console.log(`✅ Medición generada para módulo ${modulo.moduloId}`);
                    
                    // También publicar via MQTT si está conectado
                    if (mqttConnected && mqttClient) {
                        const mqttMessage = {
                            moduloId: modulo.moduloId,
                            temperatura: parseFloat(temperatura),
                            presion: parseFloat(presion),
                            timestamp: new Date().toISOString(),
                            source: 'auto_generated'
                        };
                        
                        mqttClient.publish(MQTT_TOPICS.SENSOR_DATA, JSON.stringify(mqttMessage));
                    }
                }
            });
        });
    });
};

// Inicializar generador de mediciones después de un tiempo
setTimeout(() => {
    setInterval(() => {
        console.log('🕒 Generando nuevas mediciones...');
        generarMediciones();
        // generarApuntes(); // Si tienes esta función definida en algún lado
    }, 300000); // cada 5 minutos
}, 10000); // retraso inicial de 10 segundos

//=======[ Nuevas rutas MQTT ]===============================================
// Enviar mensaje via MQTT
app.post('/mqtt/send', authenticator, (req, res) => {
    if (!mqttConnected || !mqttClient) {
        return res.status(503).json({ error: 'MQTT no está conectado' });
    }
    
    const { topic, message } = req.body;
    
    if (!topic || !message) {
        return res.status(400).json({ error: 'Topic y message son requeridos' });
    }
    
    mqttClient.publish(topic, JSON.stringify(message), (error) => {
        if (error) {
            console.error('Error enviando mensaje MQTT:', error);
            res.status(500).json({ error: 'Error enviando mensaje MQTT' });
        } else {
            console.log('📤 Mensaje MQTT enviado:', { topic, message });
            res.status(200).json({ success: true, topic, message });
        }
    });
});

// Obtener estado MQTT y topics disponibles
app.get('/mqtt/status', authenticator, (req, res) => {
    res.status(200).json({
        connected: mqttConnected,
        broker: MQTT_BROKER_URL,
        topics: MQTT_TOPICS
    });
});

// Enviar comando de control a un módulo específico
app.post('/modulo/:id/control', authenticator, (req, res) => {
    if (!mqttConnected || !mqttClient) {
        return res.status(503).json({ error: 'MQTT no está conectado' });
    }
    
    const moduloId = req.params.id;
    const { command, value } = req.body;
    
    const controlMessage = {
        moduloId: parseInt(moduloId),
        command,
        value,
        timestamp: new Date().toISOString()
    };
    
    mqttClient.publish(MQTT_TOPICS.CONTROL_COMMANDS, JSON.stringify(controlMessage), (error) => {
        if (error) {
            console.error('Error enviando comando de control:', error);
            res.status(500).json({ error: 'Error enviando comando' });
        } else {
            console.log('📤 Comando de control enviado:', controlMessage);
            res.status(200).json({ success: true, command: controlMessage });
        }
    });
});

// ====== NUEVA RUTA PARA APUNTES ======
// Actualizar apuntes (up/down) de un módulo específico
app.post('/modulo/:id/apunte', authenticator, (req, res) => {
    if (!mqttConnected || !mqttClient) {
        return res.status(503).json({ error: 'MQTT no está conectado' });
    }
    
    const moduloId = req.params.id;
    const { up, down } = req.body;
    
    // Validar que al menos uno de los valores se envíe
    if (up === undefined && down === undefined) {
        return res.status(400).json({ error: 'Se requiere al menos up o down' });
    }
    
    // Validar rangos (según tu constraint de BD: 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5)
    const validValues = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
    
    if (up !== undefined && !validValues.includes(parseFloat(up))) {
        return res.status(400).json({ error: 'Valor up inválido. Debe ser: 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5' });
    }
    
    if (down !== undefined && !validValues.includes(parseFloat(down))) {
        return res.status(400).json({ error: 'Valor down inválido. Debe ser: 0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5' });
    }
    
    const apunteMessage = {
        moduloId: parseInt(moduloId),
        timestamp: new Date().toISOString()
    };
    
    // Solo agregar los campos que se envíen
    if (up !== undefined) apunteMessage.up = parseFloat(up);
    if (down !== undefined) apunteMessage.down = parseFloat(down);
    
    mqttClient.publish(MQTT_TOPICS.APUNTE_DATA, JSON.stringify(apunteMessage), (error) => {
        if (error) {
            console.error('Error enviando datos de apunte:', error);
            res.status(500).json({ error: 'Error enviando datos de apunte' });
        } else {
            console.log('📤 Datos de apunte enviados:', apunteMessage);
            res.status(200).json({ success: true, apunte: apunteMessage });
        }
    });
});

//=======[ Rutas de la API originales ]=====================================
app.post('/login', (req, res) => {
    if (req.body) {
        var userData = req.body;
        // Verifica credenciales contra el usuario de prueba
        if (testUser.username === userData.username && testUser.password === userData.password) {
            var token = jwt.sign(userData, YOUR_SECRET_KEY);
            res.status(200).send({
                signed_user: userData,
                token: token
            });
        } else {
            res.status(403).send({ errorMessage: 'Auth required' });
        }
    } else {
        res.status(403).send({ errorMessage: 'Se requiere un usuario y contraseña' });
    }
});

// Ruta raíz (respuesta simple)
app.get('/', function (req, res) {
    res.status(200).send({ 
        mensaje: 'Hola DAM con MQTT',
        mqtt: {
            connected: mqttConnected,
            broker: MQTT_BROKER_URL
        }
    });
});

// Ruta protegida de prueba (requiere autenticación)
app.get('/prueba', authenticator, function (req, res) {
    res.send({ message: 'Está autenticado, accede a los datos' });
});

// Ruta protegida que responde a cualquier método HTTP
app.all('/secreto', authenticator, function (req, res) {
    console.log(req.method);
    res.status(200).send('Secreto');
});

// Ruta protegida que devuelve todos los modulos desde la BD
app.get('/devices', authenticator, function (req, res) {
    const query = 'SELECT * FROM Modulos';
    pool.query(query, (error, results) => {
        if (error) {
            console.error('Error al obtener los modulos:', error);
            res.status(500).send({ error: 'Error al obtener los modulos' });
        } else {
            res.status(200).send(results);
        }
    });
});

// Rutas adicionales para /modulo (importadas de otro módulo)
app.use('/modulo', authenticator, routerModulos);

//=======[ Server Listener ]===================================================
// Inicia el servidor en el puerto configurado
app.listen(PORT, function (req, res) {
    console.log(`🚀 NodeJS API running correctly on port ${PORT}`);
    console.log(`📡 MQTT integration initializing...`);
    
    // Inicializar MQTT después de que el servidor esté listo
    setTimeout(() => {
        connectMQTT();
    }, 2000);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('🔄 Cerrando aplicación...');
    if (mqttClient) {
        mqttClient.end();
    }
    process.exit();
});

//=======[ End of file ]=======================================================