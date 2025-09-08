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
            console.error('Error al encender el módulo reset:', err);
            return res.status(500).send({ error: 'No se pudo encender el módulo' });
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
            console.error('Error al apagar el módulo:', err);
            return res.status(500).send({ error: 'No se pudo apagar el módulo' });
        }
        res.status(200).send({ message: 'Reset no reiniciado exitosamente' });
    });
});

// Obtener estado de la módulo
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


// Obtener apunte
routerModulos.get('/:id/apunte', (req, res) => {
    const moduloId = req.params.id;
    const query = `
        SELECT valor_up as up, valor_down as down, fecha
        FROM Beam
        WHERE modulo_id = ?
        ORDER BY fecha DESC
        LIMIT 1`;

    pool.query(query, [moduloId], (err, result) => {
        if (err) {
            console.error('Error al obtener el apunte:', err);
            return res.status(500).send({ error: 'Error al obtener el apunte' });
        } else if (result.length === 0) {
            // Si no hay apuntes en Beam, devolver los valores por defecto de Modulos
            const queryDefault = `SELECT up, down FROM Modulos WHERE moduloId = ?`;
            pool.query(queryDefault, [moduloId], (err2, result2) => {
                if (err2) {
                    return res.status(500).send({ error: 'Error al obtener valores por defecto' });
                }
                return res.status(200).send(result2[0] || { up: 0.0, down: 0.0 });
            });
        } else {
            res.status(200).send(result[0]);
        }
    });
});

// Endpoint para actualizar apuntes
routerModulos.post('/:id/apunte', (req, res) => {
    const moduloId = req.params.id;
    const { up, down } = req.body;
    
    const query = `
        INSERT INTO Beam (modulo_id, fecha, valor_up, valor_down)
        VALUES (?, NOW(), ?, ?)`;
        
    pool.query(query, [moduloId, up, down], (err, result) => {
        if (err) {
            return res.status(500).send({ error: 'Error al obtener valores por defecto' });
        }
        return res.status(200).send(result[0] || { up: 0.0, down: 0.0 });
    });
});

// Obtener historial completo de apuntes desde tabla Beam
routerModulos.get('/:id/historial-apuntes', (req, res) => {
    const moduloId = req.params.id;
    
    // Parámetros opcionales para filtrado por fecha
    const fechaDesde = req.query.fechaDesde;
    const fechaHasta = req.query.fechaHasta;
    
    let query = `
        SELECT 
            beamId as apunteId,
            fecha,
            valor_up as up,
            valor_down as down,
            modulo_id as moduloId
        FROM Beam
        WHERE modulo_id = ?`;
    
    const params = [moduloId];
    
    // Agregar filtros de fecha si se proporcionan
    if (fechaDesde) {
        query += ` AND fecha >= ?`;
        params.push(fechaDesde);
    }
    
    if (fechaHasta) {
        query += ` AND fecha <= ?`;
        params.push(fechaHasta);
    }
    
    // Ordenar por fecha descendente (más reciente primero)
    query += ` ORDER BY fecha DESC`;
    
    // Limitar resultados para evitar problemas de rendimiento (opcional)
    query += ` LIMIT 1000`;
    
    console.log('Consultando historial de apuntes para módulo:', moduloId);
    console.log('Query:', query);
    console.log('Parámetros:', params);
    
    pool.query(query, params, (err, result) => {
        if (err) {
            console.error('Error al obtener historial de apuntes:', err);
            return res.status(500).json({ error: 'Error al obtener historial de apuntes' });
        }
        
        console.log(`Encontrados ${result.length} registros de apuntes para módulo ${moduloId}`);
        
        // Si no hay resultados, devolver array vacío
        if (result.length === 0) {
            return res.status(200).json([]);
        }
        
        // Formatear las fechas para que sean compatibles con el frontend
        const apuntesFormateados = result.map(apunte => ({
            apunteId: apunte.apunteId,
            fecha: apunte.fecha,  // La fecha ya viene en formato correcto desde MySQL
            up: parseFloat(apunte.up),      // Asegurar que sean números
            down: parseFloat(apunte.down),  // Asegurar que sean números
            moduloId: parseInt(apunte.moduloId)
        }));
        
        res.status(200).json(apuntesFormateados);
    });
});

// Endpoint adicional para obtener estadísticas de apuntes
routerModulos.get('/:id/apuntes-estadisticas', (req, res) => {
    const moduloId = req.params.id;
    
    const query = `
        SELECT 
            COUNT(*) as total_registros,
            MAX(valor_up) as up_max,
            MIN(valor_up) as up_min,
            AVG(valor_up) as up_promedio,
            MAX(valor_down) as down_max,
            MIN(valor_down) as down_min,
            AVG(valor_down) as down_promedio,
            MIN(fecha) as fecha_primer_registro,
            MAX(fecha) as fecha_ultimo_registro
        FROM Beam
        WHERE modulo_id = ?`;
    
    pool.query(query, [moduloId], (err, result) => {
        if (err) {
            console.error('Error al obtener estadísticas de apuntes:', err);
            return res.status(500).json({ error: 'Error al obtener estadísticas' });
        }
        
        if (result.length > 0) {
            const stats = result[0];
            res.status(200).json({
                total_registros: stats.total_registros,
                up: {
                    max: parseFloat(stats.up_max) || 0,
                    min: parseFloat(stats.up_min) || 0,
                    promedio: parseFloat(stats.up_promedio) || 0
                },
                down: {
                    max: parseFloat(stats.down_max) || 0,
                    min: parseFloat(stats.down_min) || 0,
                    promedio: parseFloat(stats.down_promedio) || 0
                },
                fecha_primer_registro: stats.fecha_primer_registro,
                fecha_ultimo_registro: stats.fecha_ultimo_registro
            });
        } else {
            res.status(200).json({
                total_registros: 0,
                up: { max: 0, min: 0, promedio: 0 },
                down: { max: 0, min: 0, promedio: 0 },
                fecha_primer_registro: null,
                fecha_ultimo_registro: null
            });
        }
    });
});

module.exports = routerModulos;
