const express = require('express');

const routerModulos = express.Router();

var pool = require('../mysql-connector');

// Obtener todos los Modulos
routerModulos.get('/', (req, res) => {
    pool.query('SELECT * FROM Modulos', (err, result) => {
        if (err) {
            console.error('Error al consultar modulos:', err);
            return res.status(400).send(err);
        }
        res.status(200).send(result);
    });
});

// Obtener detalle de un modulo
routerModulos.get('/:id', (req, res) => {
    const moduloId = req.params.id;
    const query = `
        SELECT d.moduloId, d.nombre AS moduloNombre, d.ubicacion, 
               e.resetId, e.nombre AS resetName
        FROM Modulos d
        INNER JOIN Control_Reinicio e ON d.resetId = e.resetId
        WHERE d.moduloId = ?`;

    pool.query(query, [moduloId], (err, result) => {
        if (err) {
            console.error('Error al obtener el modulo:', err);
            return res.status(500).json({ error: 'Error al obtener el modulo' });
        }
        if (result.length === 0) {
            return res.status(404).json({ error: 'Modulo no encontrado' });
        }
        res.status(200).json(result[0]);
    });
});

// Registrar reinicio módulo
routerModulos.post('/:id/reset', (req, res) => {
    const moduloId = req.params.id;
    const { reinicio } = req.body;
    const fecha = new Date();

    const queryLog = `
        INSERT INTO Log_Reinicios (reinicio, fecha, resetId)
        SELECT ?, ?, resetId
        FROM Modulos
        WHERE moduloId = ?`;

    pool.query(queryLog, [reinicio, fecha, moduloId], (err) => {
        if (err) {
            console.error('Error al registrar el riego:', err);
            return res.status(500).json({ error: 'Error al registrar el riego' });
        }
        res.status(200).json({ mensaje: `Módulo ${reinicio ? 'reinicio' : 'no reiniciado'} correctamente` });
    });
});

// Obtener todas las mediciones de un modulo
routerModulos.get('/:id/mediciones', (req, res) => {
    const moduloId = req.params.id;
    const query = `
        SELECT medicionId, fecha, valor_temp, valor_press
        FROM Mediciones
        WHERE moduloId = ?
        ORDER BY fecha DESC`;

    pool.query(query, [moduloId], (err, result) => {
        if (err) {
            console.error('Error al obtener las mediciones:', err);
            return res.status(500).json({ error: 'Error al obtener las mediciones' });
        }
        res.status(200).json(result);
    });
});

// Reiniciar módulo
routerModulos.post('/:id/abrir', (req, res) => {
    const resetId = req.params.id;
    const query = `
        INSERT INTO Log_Reinicios (resetId, reinicio, fecha)
        VALUES (?, 1, NOW())`;

    pool.query(query, [resetId], (err) => {
        if (err) {
            console.error('Error al abrir la modulo reset:', err);
            return res.status(500).send({ error: 'No se pudo abrir la válvula' });
        }
        res.status(200).send({ message: 'Reset reinicio exitosamente' });
    });
});

// No reinicio modulo
routerModulos.post('/:id/cerrar', (req, res) => {
    const resetId = req.params.id;
    const query = `
        INSERT INTO Log_Reinicios (resetId, reinicio, fecha)
        VALUES (?, 0, NOW())`;

    pool.query(query, [resetId], (err) => {
        if (err) {
            console.error('Error al cerrar la válvula:', err);
            return res.status(500).send({ error: 'No se pudo cerrar la válvula' });
        }
        res.status(200).send({ message: 'Reset no reiniciado exitosamente' });
    });
});

// Obtener estado de la válvula
routerModulos.get('/:id/estado', (req, res) => {
    const resetId = req.params.id;
    const query = `
        SELECT reinicio
        FROM Log_Reinicios
        WHERE resetId = ?
        ORDER BY fecha DESC
        LIMIT 1`;

    pool.query(query, [resetId], (err, result) => {
        if (err) {
            console.error('Error al obtener el estado del módulo:', err);
            return res.status(500).send({ error: 'No se pudo obtener del módulo' });
        }
        if (result.length > 0) {
            res.status(200).send({ estado: result[0].reinicio === 1 });
        } else {
            res.status(200).send({ estado: false });
        }
    });
});

// Obtener última medición
routerModulos.get('/:id/ultima-medicion', (req, res) => {
    const moduloId = req.params.id;
    const query = `
        SELECT fecha, valor_temp, valor_press
        FROM Mediciones
        WHERE moduloId = ?
        ORDER BY fecha DESC
        LIMIT 1`;

    pool.query(query, [moduloId], (err, result) => {
        if (err) {
            console.error('Error al obtener la última medición:', err);
            return res.status(500).send({ error: 'Error al obtener la última medición' });
        } else if (result.length === 0) {
            return res.status(404).send({ error: 'No se encontraron mediciones para este modulo' });
        } else {
            res.status(200).send(result[0]);
        }
    });
});

module.exports = routerModulos;
