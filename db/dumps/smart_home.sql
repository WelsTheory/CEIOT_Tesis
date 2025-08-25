-- ===================================================================
-- PASO 1: CREAR TABLAS SIN CLAVES FORÁNEAS
-- ===================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `ABS` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;
USE `ABS`;

-- Crear tabla Control_Reinicio PRIMERO (sin moduloId por ahora)
CREATE TABLE `Control_Reinicio` (
  `resetId` int(11) NOT NULL,
  `nombre` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Crear tabla Modulos
CREATE TABLE `Modulos` (
  `moduloId` int(11) NOT NULL,
  `nombre` varchar(200) DEFAULT NULL,
  `ubicacion` enum('Norte','Sur','Este','Oeste') DEFAULT NULL,
  `version` enum('1.0','2.0') DEFAULT '1.0',
  `up` decimal(2,1) DEFAULT 0.0,
  `down` decimal(2,1) DEFAULT 0.0,
  `temp_min` decimal(4,1) DEFAULT NULL COMMENT 'Temperatura mínima operativa',
  `temp_max` decimal(4,1) DEFAULT NULL COMMENT 'Temperatura máxima operativa',
  `press_min` decimal(4,1) DEFAULT NULL COMMENT 'Presión mínima operativa',
  `press_max` decimal(4,1) DEFAULT NULL COMMENT 'Presión máxima operativa',
  `resetId` int(11) DEFAULT NULL,
  CONSTRAINT `chk_up_values` CHECK (`up` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5)),
  CONSTRAINT `chk_down_values` CHECK (`down` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5))
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Crear otras tablas
CREATE TABLE `Mediciones` (
  `medicionId` int(11) NOT NULL,
  `fecha` datetime DEFAULT NULL,
  `valor_temp` varchar(100) DEFAULT NULL COMMENT 'Lectura actual de temperatura',
  `valor_press` varchar(100) DEFAULT NULL COMMENT 'Lectura actual de presion',
  `moduloId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `Beam` (
  `beamId` int(11) NOT NULL,
  `fecha` datetime DEFAULT NULL,
  `valor_up` decimal(2,1) DEFAULT 0.0,
  `valor_down` decimal(2,1) DEFAULT 0.0,
  `modulo_id` int(11) NOT NULL,
  CONSTRAINT `chk_beam_up_values` CHECK (`valor_up` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5)),
  CONSTRAINT `chk_beam_down_values` CHECK (`valor_down` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5))
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

CREATE TABLE `Log_Reinicios` (
  `logResetId` int(11) NOT NULL,
  `reinicio` tinyint(4) DEFAULT NULL,
  `fecha` datetime DEFAULT NULL,
  `resetId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- ÍNDICES
ALTER TABLE `Control_Reinicio` ADD PRIMARY KEY (`resetId`);
ALTER TABLE `Modulos` ADD PRIMARY KEY (`moduloId`), ADD KEY `fk_Modulos_Control_Reinicio_idx` (`resetId`);
ALTER TABLE `Mediciones` ADD PRIMARY KEY (`medicionId`,`moduloId`), ADD KEY `fk_Mediciones_Modulos_idx` (`moduloId`);
ALTER TABLE `Beam` ADD PRIMARY KEY (`beamId`,`modulo_id`), ADD KEY `fk_Beam_Modulos_idx` (`modulo_id`);
ALTER TABLE `Log_Reinicios` ADD PRIMARY KEY (`logResetId`,`resetId`), ADD KEY `fk_Log_Reinicios_Control_Reinicio_idx` (`resetId`);

-- AUTO_INCREMENT
ALTER TABLE `Control_Reinicio` MODIFY `resetId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;
ALTER TABLE `Modulos` MODIFY `moduloId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;
ALTER TABLE `Mediciones` MODIFY `medicionId` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `Beam` MODIFY `beamId` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `Log_Reinicios` MODIFY `logResetId` int(11) NOT NULL AUTO_INCREMENT;

COMMIT;

-- ===================================================================
-- PASO 2: INSERTAR DATOS
-- ===================================================================

-- Insertar Control_Reinicio PRIMERO
INSERT INTO `Control_Reinicio` (`resetId`, `nombre`) VALUES
(1, 'CRNorte1'),
(2, 'CRSur1'),
(3, 'CREste1'),
(4, 'CROeste1'),
(5, 'CRNorte2'),
(6, 'CRSur2'),
(7, 'CREste3'),
(8, 'CROeste4'),
(9, 'CRNorte5'),
(10, 'CRSur6'),
(11, 'CREste7'),
(12, 'CROeste8'),
(13, 'CRNorte9');

-- Insertar Modulos DESPUÉS
INSERT INTO `Modulos` VALUES 
-- id, nombre, ubicacion,version, up, down, temp_min, temp_max, press_min, press_max, resetId
(1, 'Modulo 1', 'Norte', '1.0', 1.0, 0.5, 15.0, 25.0, 1.0, 3.0, 1),
(2, 'Modulo 1', 'Sur', '2.0', 0.0, 1.5, 18.0, 28.0, 1.5, 3.5, 2),
(3, 'Modulo 1', 'Este', '2.0', 2.0, 0.5, 20.0, 30.0, 2.0, 4.0, 3),
(4, 'Modulo 1', 'Oeste', '1.0', 3.0, 3.5, 22.0, 32.0, 1.8, 3.8, 4),
(5, 'Modulo 2', 'Norte', '2.0', 1.0, 0.5, 15.0, 25.0, 1.0, 3.0, 5),
(6, 'Modulo 2', 'Sur', '2.0', 0.0, 1.5, 18.0, 28.0, 1.5, 3.5, 6),
(7, 'Modulo 3', 'Este', '2.0', 2.0, 0.5, 20.0, 30.0, 2.0, 4.0, 7),
(8, 'Modulo 4', 'Oeste', '2.0', 3.0, 3.5, 22.0, 32.0, 1.8, 3.8, 8),
(9, 'Modulo 5', 'Norte', '2.0', 3.5, 3.5, 16.0, 26.0, 1.2, 3.2, 9),
(10, 'Modulo 6', 'Sur', '1.0', 0.0, 0.0, 19.0, 29.0, 1.4, 3.4, 10),
(11, 'Modulo 7', 'Este', '2.0', 1.0, 2.0, 21.0, 31.0, 1.6, 3.6, 11),
(12, 'Modulo 8', 'Oeste', '1.0', 2.0, 2.5, 17.0, 27.0, 1.3, 3.3, 12),
(13, 'Modulo 9', 'Norte', '2.0', 3.0, 3.5, 23.0, 33.0, 1.7, 3.7, 13);

-- ===================================================================
-- PASO 3: AGREGAR moduloId A Control_Reinicio Y CREAR CLAVES FORÁNEAS
-- ===================================================================

-- Agregar campo moduloId a Control_Reinicio
ALTER TABLE `Control_Reinicio` ADD `moduloId` int(11) DEFAULT NULL;
ALTER TABLE `Control_Reinicio` ADD KEY `fk_Control_Reinicio_Modulos_idx` (`moduloId`);

-- Actualizar los datos para relacionar Control_Reinicio con Modulos
UPDATE `Control_Reinicio` SET `moduloId` = 1 WHERE `resetId` = 1;
UPDATE `Control_Reinicio` SET `moduloId` = 2 WHERE `resetId` = 2;
UPDATE `Control_Reinicio` SET `moduloId` = 3 WHERE `resetId` = 3;
UPDATE `Control_Reinicio` SET `moduloId` = 4 WHERE `resetId` = 4;
UPDATE `Control_Reinicio` SET `moduloId` = 5 WHERE `resetId` = 5;
UPDATE `Control_Reinicio` SET `moduloId` = 6 WHERE `resetId` = 6;
UPDATE `Control_Reinicio` SET `moduloId` = 7 WHERE `resetId` = 7;
UPDATE `Control_Reinicio` SET `moduloId` = 8 WHERE `resetId` = 8;
UPDATE `Control_Reinicio` SET `moduloId` = 9 WHERE `resetId` = 9;

-- ===================================================================
-- PASO 4: CREAR TODAS LAS CLAVES FORÁNEAS
-- ===================================================================

-- Ahora sí podemos crear las claves foráneas
ALTER TABLE `Modulos`
  ADD CONSTRAINT `fk_Modulos_Control_Reinicio` FOREIGN KEY (`resetId`) REFERENCES `Control_Reinicio` (`resetId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `Control_Reinicio`
  ADD CONSTRAINT `fk_Control_Reinicio_Modulos` FOREIGN KEY (`moduloId`) REFERENCES `Modulos` (`moduloId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `Mediciones`
  ADD CONSTRAINT `fk_Mediciones_Modulos` FOREIGN KEY (`moduloId`) REFERENCES `Modulos` (`moduloId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `Beam`
  ADD CONSTRAINT `fk_Beam_Modulos` FOREIGN KEY (`modulo_id`) REFERENCES `Modulos` (`moduloId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE `Log_Reinicios`
  ADD CONSTRAINT `fk_Log_Reinicios_Control_Reinicio` FOREIGN KEY (`resetId`) REFERENCES `Control_Reinicio` (`resetId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- ===================================================================
-- PASO 5: CREAR LA VISTA
-- ===================================================================

CREATE VIEW `Vista_Estado_Modulos` AS
SELECT 
    m.moduloId,
    m.nombre,
    m.ubicacion,
    m.version,
    m.temp_min,
    m.temp_max,
    m.press_min,
    m.press_max,
    med.valor_temp AS temp_actual,
    med.valor_press AS press_actual,
    med.fecha AS ultima_medicion,
    CASE 
        WHEN med.valor_temp IS NULL THEN 'SIN_DATOS'
        WHEN CAST(med.valor_temp AS DECIMAL(4,1)) < m.temp_min THEN 'TEMP_BAJA'
        WHEN CAST(med.valor_temp AS DECIMAL(4,1)) > m.temp_max THEN 'TEMP_ALTA' 
        ELSE 'TEMP_OK'
    END AS estado_temperatura,
    CASE 
        WHEN med.valor_press IS NULL THEN 'SIN_DATOS'
        WHEN CAST(med.valor_press AS DECIMAL(4,1)) < m.press_min THEN 'PRESS_BAJA'
        WHEN CAST(med.valor_press AS DECIMAL(4,1)) > m.press_max THEN 'PRESS_ALTA'
        ELSE 'PRESS_OK'
    END AS estado_presion
FROM Modulos m
LEFT JOIN (
    SELECT m1.moduloId, m1.valor_temp, m1.valor_press, m1.fecha
    FROM Mediciones m1
    WHERE m1.fecha = (
        SELECT MAX(m2.fecha) 
        FROM Mediciones m2 
        WHERE m2.moduloId = m1.moduloId
    )
) med ON m.moduloId = med.moduloId;

-- ===================================================================
-- VERIFICACIÓN FINAL
-- ===================================================================

SELECT 'Base de datos creada exitosamente' as resultado;
SELECT COUNT(*) as total_modulos FROM Modulos;
SELECT COUNT(*) as total_controles FROM Control_Reinicio;