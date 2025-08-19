//=======[ Settings, Imports & Data ]==========================================
var PORT = 3000;

// Importación de librerías necesarias
var express = require('express');
var cors = require('cors');
const jwt = require('jsonwebtoken');
var pool = require('./mysql-connector');

// Importación de rutas personalizadas para dispositivos
const routerDispositivos = require('./dispositivos/index');
const routerModulos = require('./modulos/index');

// Inicialización de la aplicación Express
var app = express();

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
    console.log('Intentando obtener dispositivos para generar mediciones...');
    // Query para obtener todos los dispositivos
    const queryDispositivos = 'SELECT dispositivoId FROM Dispositivos';
    // Query para insertar una medición
    const queryInsertMedicion = `
        INSERT INTO Mediciones (dispositivoId, fecha, valor)
        VALUES (?, NOW(), ?)`;
    // Consulta a la base de datos
    pool.query(queryDispositivos, (err, dispositivos) => {
        if (err) {
            console.error('Error al obtener dispositivos:', err);
            return;
        }
        // Para cada dispositivo, genera una medición aleatoria
        dispositivos.forEach(({ dispositivoId }) => {
            const valor = (Math.random() * 100).toFixed(2);
            pool.query(queryInsertMedicion, [dispositivoId, valor], (err) => {
                if (err) {
                    console.error(`Error al registrar medición para dispositivo ${dispositivoId}:`, err);
                } else {
                    console.log(`Medición registrada para dispositivo ${dispositivoId}: ${valor}`);
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
    }, 300000); // cada 5 minutos
}, 10000); // retraso inicial de 10 segundos

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
    res.status(200).send({ mensaje: 'Hola DAM' });
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

// Ruta protegida que devuelve todos los dispositivos desde la BD
app.get('/devices', authenticator, function (req, res) {
    const query = 'SELECT * FROM Dispositivos';
    pool.query(query, (error, results) => {
        if (error) {
            console.error('Error al obtener los dispositivos:', error);
            res.status(500).send({ error: 'Error al obtener los dispositivos' });
        } else {
            res.status(200).send(results);
        }
    });
});

// Rutas adicionales para /dispositivo (importadas de otro módulo)
app.use('/dispositivo', authenticator, routerDispositivos);

//=======[ Server Listener ]===================================================
// Inicia el servidor en el puerto configurado
app.listen(PORT, function (req, res) {
    console.log(`NodeJS API running correctly on port ${PORT}`);
});

//=======[ End of file ]=======================================================

