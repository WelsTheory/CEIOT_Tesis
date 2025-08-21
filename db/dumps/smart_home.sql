-- phpMyAdmin SQL Dump
-- version 4.9.0.1
-- https://www.phpmyadmin.net/
--
-- Servidor: mysql-server
-- Tiempo de generación: 19-08-2025 a las 23:27:10
-- Versión del servidor: 5.7.27
-- Versión de PHP: 7.2.19

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Base de datos: `ABS`
--
CREATE DATABASE IF NOT EXISTS `ABS` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;
USE `ABS`;

-- --------------------------------------------------------
--
-- Estructura de tabla para la tabla `Modulos`
--
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

-- --------------------------------------------------------
--
-- Estructura de tabla para la tabla `Mediciones`
--
CREATE TABLE `Mediciones` (
  `medicionId` int(11) NOT NULL,
  `fecha` datetime DEFAULT NULL,
  `valor_temp` varchar(100) DEFAULT NULL COMMENT 'Lectura actual de temperatura',
  `valor_press` varchar(100) DEFAULT NULL COMMENT 'Lectura actual de presion',
  `moduloId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;


-- --------------------------------------------------------
--
-- Estructura de tabla para la tabla `Control_Reinicio`
--
CREATE TABLE `Control_Reinicio` (
  `resetId` int(11) NOT NULL,
  `nombre` varchar(45) DEFAULT NULL,
  `moduloId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------
--
-- Estructura de tabla para la tabla `Beam` (NUEVA)
--
CREATE TABLE `Beam` (
  `beamId` int(11) NOT NULL,
  `fecha` datetime DEFAULT NULL,
  `valor_up` decimal(2,1) DEFAULT 0.0,
  `valor_down` decimal(2,1) DEFAULT 0.0,
  `modulo_id` int(11) NOT NULL,
  CONSTRAINT `chk_beam_up_values` CHECK (`valor_up` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5)),
  CONSTRAINT `chk_beam_down_values` CHECK (`valor_down` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5))
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------
-- Tabla Log_Riegos (que faltaba)
--
CREATE TABLE `Log_Reinicios` (
  `logResetId` int(11) NOT NULL,
  `apertura` tinyint(4) DEFAULT NULL,
  `fecha` datetime DEFAULT NULL,
  `resetId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Volcado de datos para la tabla `Modulos`
--

-- Configurar módulo con límites
INSERT INTO Modulos VALUES 
(1, 'Modulo 1', 'Norte', '1.0', 1.0, 0.5, 15.0, 25.0, 1.0, 3.0, 1),
(2, 'Modulo 2', 'Sur', '2.0', 0.0, 1.5, 18.0, 28.0, 1.5, 3.5, 2),
(3, 'Modulo 3', 'Este', '2.0', 2.0, 0.5, 20.0, 30.0, 2.0, 4.0, 3),
(4, 'Modulo 4', 'Oeste', '2.0', 3.0, 3.5, 22.0, 32.0, 1.8, 3.8, 4),
(5, 'Modulo 5', 'Norte', '2.0', 3.5, 3.5, 16.0, 26.0, 1.2, 3.2, 5),
(6, 'Modulo 6', 'Sur', '1.0', 0.0, 0.0, 19.0, 29.0, 1.4, 3.4, 6),
(7, 'Modulo 7', 'Este', '2.0', 1.0, 2.0, 21.0, 31.0, 1.6, 3.6, 7),
(8, 'Modulo 8', 'Oeste', '1.0', 2.0, 2.5, 17.0, 27.0, 1.3, 3.3, 8),
(9, 'Modulo 9', 'Norte', '2.0', 3.0, 3.5, 23.0, 33.0, 1.7, 3.7, 9);

-- --------------------------------------------------------
--
-- Volcado de datos para la tabla `Control_Reinicio`
--
INSERT INTO `Control_Reinicio` (`resetId`, `nombre`) VALUES
(1, 'CRSur1'),
(2, 'CRNorte1'),
(3, 'CROeste1'),
(4, 'CREste1'),
(5, 'CRSur2'),
(6, 'CRNorte2'),
(7, 'CREste2'),
(8, 'CROeste2'),
(9, 'CRSur3');

-- --------------------------------------------------------
--
-- ÍNDICES Y RESTRICCIONES PARA TODAS LAS TABLAS
--
-- Índices para la tabla `Modulos`
ALTER TABLE `Modulos`
  ADD PRIMARY KEY (`moduloId`),
  ADD KEY `fk_Modulos_Control_Reinicio_idx` (`resetId`);

-- Índices para la tabla `Control_Reinicio`
ALTER TABLE `Control_Reinicio`
  ADD PRIMARY KEY (`resetId`),
  ADD KEY `fk_Control_Reinicio_Modulos_idx` (`moduloId`);

-- Índices para la tabla `Mediciones`
ALTER TABLE `Mediciones`
  ADD PRIMARY KEY (`medicionId`,`moduloId`),
  ADD KEY `fk_Mediciones_Modulos_idx` (`moduloId`);

-- Índices para la tabla `Beam`
ALTER TABLE `Beam`
  ADD PRIMARY KEY (`beamId`,`modulo_id`),
  ADD KEY `fk_Beam_Modulos_idx` (`modulo_id`);

-- Índices para la tabla `Log_Riegos`
ALTER TABLE `Log_Riegos`
  ADD PRIMARY KEY (`logRiegoId`,`resetId`),
  ADD KEY `fk_Log_Riegos_Control_Reinicio_idx` (`resetId`);

-- --------------------------------------------------------
-- AUTO_INCREMENT PARA LAS TABLAS
--

ALTER TABLE `Modulos`
  MODIFY `moduloId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

ALTER TABLE `Control_Reinicio`
  MODIFY `resetId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

ALTER TABLE `Mediciones`
  MODIFY `medicionId` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `Beam`
  MODIFY `beamId` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `Log_Riegos`
  MODIFY `logRiegoId` int(11) NOT NULL AUTO_INCREMENT;

-- --------------------------------------------------------
-- RESTRICCIONES DE CLAVE FORÁNEA
--

-- Filtros para la tabla `Modulos`
ALTER TABLE `Modulos`
  ADD CONSTRAINT `fk_Modulos_Control_Reinicio` FOREIGN KEY (`resetId`) REFERENCES `Control_Reinicio` (`resetId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Filtros para la tabla `Control_Reinicio`
ALTER TABLE `Control_Reinicio`
  ADD CONSTRAINT `fk_Control_Reinicio_Modulos` FOREIGN KEY (`moduloId`) REFERENCES `Modulos` (`moduloId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Filtros para la tabla `Mediciones`
ALTER TABLE `Mediciones`
  ADD CONSTRAINT `fk_Mediciones_Modulos` FOREIGN KEY (`moduloId`) REFERENCES `Modulos` (`moduloId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Filtros para la tabla `Beam`
ALTER TABLE `Beam`
  ADD CONSTRAINT `fk_Beam_Modulos` FOREIGN KEY (`modulo_id`) REFERENCES `Modulos` (`moduloId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- Filtros para la tabla `Log_Riegos`
ALTER TABLE `Log_Riegos`
  ADD CONSTRAINT `fk_Log_Riegos_Control_Reinicio` FOREIGN KEY (`resetId`) REFERENCES `Control_Reinicio` (`resetId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- --------------------------------------------------------
-- VISTA PARA COMBINAR CONFIGURACIONES CON ÚLTIMA MEDICIÓN
--
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
        WHEN CAST(med.valor_temp AS DECIMAL(4,1)) < m.temp_min THEN 'TEMP_BAJA'
        WHEN CAST(med.valor_temp AS DECIMAL(4,1)) > m.temp_max THEN 'TEMP_ALTA' 
        ELSE 'TEMP_OK'
    END AS estado_temperatura,
    CASE 
        WHEN CAST(med.valor_press AS DECIMAL(4,1)) < m.press_min THEN 'PRESS_BAJA'
        WHEN CAST(med.valor_press AS DECIMAL(4,1)) > m.press_max THEN 'PRESS_ALTA'
        ELSE 'PRESS_OK'
    END AS estado_presion
FROM Modulos m
LEFT JOIN (
    SELECT moduloId, valor_temp, valor_press, fecha,
           ROW_NUMBER() OVER (PARTITION BY moduloId ORDER BY fecha DESC) as rn
    FROM Mediciones
) med ON m.moduloId = med.moduloId AND med.rn = 1;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;