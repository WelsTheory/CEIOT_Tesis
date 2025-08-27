//=======[ Settings, Imports & Data ]==========================================
var PORT = 3000;

// Importación de librerías necesarias
var express = require('express');
var cors = require('cors');
const jwt = require('jsonwebtoken');
var pool = require('./mysql-connector');
const mqtt = require('mqtt');

// Importación de rutas personalizadas para modulos
const routerModulos = require('./modulos/index');

// Inicialización de la aplicación Express
var app = express();

//=======[ MQTT Configuration ]=============================================
const MQTT_BROKER_URL = 'mqtt://mosquitto:1883'; // ← Usar nombre del contenedor Docker
const MQTT_TOPICS = {
    SENSOR_DATA: 'sensores/data',
    CONTROL_COMMANDS: 'control/commands',
    DEVICE_STATUS: 'dispositivos/estado',
    MEASUREMENTS: 'mediciones/nuevas'
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
    console.log('Intentando obtener modulos para generar mediciones...');
    // Query para obtener todos los modulos
    const queryModulos = 'SELECT moduloId FROM Modulos';
    // Query para insertar una medición
    const queryInsertMedicion = `
        INSERT INTO Mediciones (moduloId, fecha, valor_temp, valor_press)
        VALUES (?, NOW(), ?, ?)`;
    // Consulta a la base de datos
    pool.query(queryModulos, (err, modulos) => {
        if (err) {
            console.error('Error al obtener modulos:', err);
            return;
        }
        // Para cada modulo, genera una medición aleatoria
        modulos.forEach(({ moduloId }) => {
            const valor1 = (Math.random() * 100).toFixed(2);
            const valor2 = (Math.random() * 99).toFixed(2);
            pool.query(queryInsertMedicion, [moduloId, valor1,valor2], (err) => {
                if (err) {
                    console.error(`Error al registrar medición para modulo ${moduloId}:`, err);
                } else {
                    console.log(`Medición registrada para modulo ${moduloId}: ${valor1} y ${valor2}`);
                }
            });
        });
    });
};

const generarApuntes = () => {
    console.log('Intentando obtener apuntes de módulos...');
    
    // Valores permitidos según las restricciones de la BD
    const valoresPermitidos = [0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5];
    
    // Query para obtener todos los modulos existentes
    const queryModulos = 'SELECT moduloId FROM Modulos';
    
    // Query para insertar una medición
    const queryInsertApuntes = `
        INSERT INTO Beam (modulo_id, fecha, valor_up, valor_down)
        VALUES (?, NOW(), ?, ?)`;
    
    // Consulta a la base de datos
    pool.query(queryModulos, (err, modulos) => {
        if (err) {
            console.error('Error al obtener los módulos:', err);
            return;
        }
        
        // Para cada modulo, genera una medición aleatoria
        modulos.forEach(({ moduloId }) => {
            // Generar valores aleatorios de los valores permitidos
            const valor_up = valoresPermitidos[Math.floor(Math.random() * valoresPermitidos.length)];
            const valor_down = valoresPermitidos[Math.floor(Math.random() * valoresPermitidos.length)];
            
            pool.query(queryInsertApuntes, [moduloId, valor_up, valor_down], (err) => {
                if (err) {
                    console.error(`Error al registrar el apunte para modulo ${moduloId}:`, err);
                } else {
                    console.log(`Apunte registrado para modulo ${moduloId}: ${valor_up} y ${valor_down}`);
                }
            });
        });
    });
};

// Inicia la generación periódica de mediciones
setTimeout(() => {
    console.log('Iniciando generación periódica de mediciones...');
    setInterval(() => {
        console.log('Generando nuevas mediciones...');
        generarMediciones();
        generarApuntes();
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

//=======[ Rutas de la API ]====================================================
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
    res.status(200).send({ mensaje: 'Hola DAM con MQTT' });
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
//app.use('/modulo', authenticator, routermodulos);
app.use('/modulo', authenticator, routerModulos);

//=======[ Server Listener ]===================================================
// Inicia el servidor en el puerto configurado
app.listen(PORT, function (req, res) {
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

