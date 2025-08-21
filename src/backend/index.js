//=======[ Settings, Imports & Data ]==========================================
var PORT = 3000;

// Importación de librerías necesarias
var express = require('express');
var cors = require('cors');
const jwt = require('jsonwebtoken');
var pool = require('./mysql-connector');

// Importación de rutas personalizadas para modulos
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
            const valor2 = (Math.random() * 100).toFixed(2);
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
    console.log(`NodeJS API running correctly on port ${PORT}`);
});

//=======[ End of file ]=======================================================

