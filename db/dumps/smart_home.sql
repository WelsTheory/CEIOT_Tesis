-- ===================================================================
-- 1: CREAR TABLAS SIN CLAVES FORÁNEAS
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
-- 2: INSERTAR DATOS
-- ===================================================================

-- Insertar Control_Reinicio PRIMERO
INSERT INTO `Control_Reinicio` (`resetId`, `nombre`) VALUES
(1,  'CRNorte1'),
(2,  'CRNorte2'),
(3,  'CRNorte3'),
(4,  'CRNorte4'),
(5,  'CREste1'),
(6,  'CREste2'),
(7,  'CREste3'),
(8,  'CREste4'),
(9,  'CRNorte5'),
(10, 'CRNorte6'),
(11, 'CRNorte7'),
(12, 'CRNorte8'),
(13, 'CREste5'),
(14, 'CREste6'),
(15, 'CREste7'),
(16, 'CREste8'),
(17, 'CRNorte9'),
(18, 'CRNorte10'),
(19, 'CRNorte11'),
(20, 'CRNorte12'),
(21, 'CREste9'),
(22, 'CREste10'),
(23, 'CREste11'),
(24, 'CREste12'),
(25, 'CRNorte13'),
(26, 'CRNorte14'),
(27, 'CRNorte15'),
(28, 'CRNorte16'),
(29, 'CRESte13'),
(30, 'CREste14'),
(31, 'CREste15'),
(32, 'CREste16'),
(33, 'CROeste1'),
(34, 'CROeste2'),
(35, 'CROeste3'),
(36, 'CROeste4'),
(37, 'CRSur1'),
(38, 'CRSur2'),
(39, 'CRSur3'),
(40, 'CRSur4'),
(41, 'CROeste5'),
(42, 'CROeste6'),
(43, 'CROeste7'),
(44, 'CROeste8'),
(45, 'CRSur5'),
(46, 'CRSur6'),
(47, 'CRSur7'),
(48, 'CRSur8'),
(49, 'CROeste9'),
(50, 'CROeste10'),
(51, 'CROeste11'),
(52, 'CROeste12'),
(53, 'CRSur9'),
(54, 'CRSur10'),
(55, 'CRSur11'),
(56, 'CRSur12'),
(57, 'CROeste13'),
(58, 'CROeste14'),
(59, 'CROeste15'),
(60, 'CROeste16'),
(61, 'CRSur13'),
(62, 'CRSur14'),
(63, 'CRSur15'),
(64, 'CRSur16');

-- Insertar Modulos DESPUÉS
INSERT INTO `Modulos` VALUES 
-- id, nombre, ubicacion,version, up, down, temp_min, temp_max, press_min, press_max, resetId
(1,  'Modulo 1', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 1),
(2,  'Modulo 2', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 2),
(3,  'Modulo 3', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 3),
(4,  'Modulo 4', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 4),
(5,  'Modulo 1', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 5),
(6,  'Modulo 2', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 6),
(7,  'Modulo 3', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 7),
(8,  'Modulo 4', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 8),
(9,  'Modulo 5', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 9),
(10, 'Modulo 6', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 10),
(11, 'Modulo 7', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 11),
(12, 'Modulo 8', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 12),
(13, 'Modulo 5', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 13),
(14, 'Modulo 6', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 14),
(15, 'Modulo 7', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 15),
(16, 'Modulo 8', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 16),
(17, 'Modulo 9', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 17),
(18, 'Modulo 10','Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 18),
(19, 'Modulo 11','Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 19),
(20, 'Modulo 12','Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 20),
(21, 'Modulo 9', 'Este',  '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 21),
(22, 'Modulo 10','Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 22),
(23, 'Modulo 11','Este',  '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 23),
(24, 'Modulo 12','Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 24),
(25, 'Modulo 13','Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 25),
(26, 'Modulo 14','Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 26),
(27, 'Modulo 15','Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 27),
(28, 'Modulo 16','Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 28),
(29, 'Modulo 13','Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 29),
(30, 'Modulo 14','Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 30),
(31, 'Modulo 15','Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 31),
(32, 'Modulo 16','Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 32),
(33, 'Modulo 1', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 33),
(34, 'Modulo 2', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 34),
(35, 'Modulo 3', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 35),
(36, 'Modulo 4', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 36),
(37, 'Modulo 1', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 37),
(38, 'Modulo 2', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 38),
(39, 'Modulo 3', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 39),
(40, 'Modulo 4', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 40),
(41, 'Modulo 5', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 41),
(42, 'Modulo 6', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 42),
(43, 'Modulo 7', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 43),
(44, 'Modulo 8', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 44),
(45, 'Modulo 5', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 45),
(46, 'Modulo 6', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 46),
(47, 'Modulo 7', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 47),
(48, 'Modulo 8', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 48),
(49, 'Modulo 9', 'Oeste', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 49),
(50, 'Modulo 10','Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 50),
(51, 'Modulo 11','Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 51),
(52, 'Modulo 12','Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 52),
(53, 'Modulo 9', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 53),
(54, 'Modulo 10','Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 54),
(55, 'Modulo 11','Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 55),
(56, 'Modulo 12','Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 56),
(57, 'Modulo 13','Oeste', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 57),
(58, 'Modulo 14','Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 58),
(59, 'Modulo 15','Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 59),
(60, 'Modulo 16','Oeste', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 60),
(61, 'Modulo 13','Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 61),
(62, 'Modulo 14','Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 62),
(63, 'Modulo 15','Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 63),
(64, 'Modulo 16','Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 64);


-- Insertar datos en Beam
INSERT INTO `Beam` (`beamId`, `fecha`, `valor_up`, `valor_down`, `modulo_id`) VALUES
(1,  NOW(), 1.0, 0.5, 1),
(2,  NOW(), 0.0, 1.5, 2),
(3,  NOW(), 2.0, 0.5, 3),
(4,  NOW(), 3.0, 3.5, 4),
(5,  NOW(), 1.0, 0.5, 5),
(6,  NOW(), 0.0, 1.5, 6),
(7,  NOW(), 2.0, 0.5, 7),
(8,  NOW(), 3.0, 3.5, 8),
(9,  NOW(), 3.5, 3.5, 9),
(10, NOW(), 0.0, 0.0, 10),
(11, NOW(), 1.0, 2.0, 11),
(12, NOW(), 0.0, 0.0, 12),
(13, NOW(), 1.0, 2.0, 13),
(14, NOW(), 0.0, 0.0, 14),
(15, NOW(), 1.0, 2.0, 15),
(16, NOW(), 0.0, 0.0, 16),
(17, NOW(), 1.0, 2.0, 17),
(18, NOW(), 0.0, 0.0, 18),
(19, NOW(), 1.0, 2.0, 19),
(20, NOW(), 0.0, 0.0, 20),
(21, NOW(), 1.0, 2.0, 21),
(22, NOW(), 0.0, 0.0, 22),
(23, NOW(), 1.0, 2.0, 23),
(24, NOW(), 0.0, 0.0, 24),
(25, NOW(), 1.0, 2.0, 25),
(26, NOW(), 0.0, 0.0, 26),
(27, NOW(), 1.0, 2.0, 27),
(28, NOW(), 0.0, 0.0, 28),
(29, NOW(), 1.0, 2.0, 29),
(30, NOW(), 0.0, 0.0, 30),
(31, NOW(), 1.0, 2.0, 31),
(32, NOW(), 0.0, 0.0, 32),
(33, NOW(), 1.0, 2.0, 33),
(34, NOW(), 0.0, 0.0, 34),
(35, NOW(), 1.0, 2.0, 35),
(36, NOW(), 0.0, 0.0, 36),
(37, NOW(), 1.0, 2.0, 37),
(38, NOW(), 0.0, 0.0, 38),
(39, NOW(), 1.0, 2.0, 39),
(40, NOW(), 2.0, 3.5, 40),
(41, NOW(), 2.5, 0.5, 41),
(42, NOW(), 3.5, 1.5, 42),
(43, NOW(), 3.0, 0.5, 43),
(44, NOW(), 1.0, 3.5, 44),
(45, NOW(), 3.0, 2.0, 45),
(46, NOW(), 2.0, 3.0, 46),
(47, NOW(), 0.0, 1.0, 47),
(48, NOW(), 0.0, 3.5, 48),
(49, NOW(), 0.0, 0.5, 49),
(50, NOW(), 0.0, 2.5, 50),
(51, NOW(), 2.5, 0.0, 51),
(52, NOW(), 1.5, 0.0, 52),
(53, NOW(), 1.5, 3.5, 53),
(54, NOW(), 1.5, 0.5, 54),
(55, NOW(), 1.5, 1.5, 55),
(56, NOW(), 2.5, 2.5, 56),
(57, NOW(), 3.5, 3.5, 57),
(58, NOW(), 1.0, 1.5, 58),
(59, NOW(), 2.5, 1.5, 59),
(60, NOW(), 2.0, 2.0, 60),
(61, NOW(), 3.0, 2.0, 61),
(62, NOW(), 1.5, 0.0, 62),
(63, NOW(), 3.5, 0.0, 63),
(64, NOW(), 0.0, 3.5, 64);

-- ===================================================================
-- 3: AGREGAR moduloId A Control_Reinicio Y CREAR CLAVES FORÁNEAS
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
UPDATE `Control_Reinicio` SET `moduloId` = 10 WHERE `resetId` = 10;
UPDATE `Control_Reinicio` SET `moduloId` = 11 WHERE `resetId` = 11;
UPDATE `Control_Reinicio` SET `moduloId` = 12 WHERE `resetId` = 12;
UPDATE `Control_Reinicio` SET `moduloId` = 13 WHERE `resetId` = 13;
UPDATE `Control_Reinicio` SET `moduloId` = 14 WHERE `resetId` = 14;
UPDATE `Control_Reinicio` SET `moduloId` = 15 WHERE `resetId` = 15;
UPDATE `Control_Reinicio` SET `moduloId` = 16 WHERE `resetId` = 16;
UPDATE `Control_Reinicio` SET `moduloId` = 17 WHERE `resetId` = 17;
UPDATE `Control_Reinicio` SET `moduloId` = 18 WHERE `resetId` = 18;
UPDATE `Control_Reinicio` SET `moduloId` = 19 WHERE `resetId` = 19;
UPDATE `Control_Reinicio` SET `moduloId` = 20 WHERE `resetId` = 20;
UPDATE `Control_Reinicio` SET `moduloId` = 21 WHERE `resetId` = 21;
UPDATE `Control_Reinicio` SET `moduloId` = 22 WHERE `resetId` = 22;
UPDATE `Control_Reinicio` SET `moduloId` = 23 WHERE `resetId` = 23;
UPDATE `Control_Reinicio` SET `moduloId` = 24 WHERE `resetId` = 24;
UPDATE `Control_Reinicio` SET `moduloId` = 25 WHERE `resetId` = 25;
UPDATE `Control_Reinicio` SET `moduloId` = 26 WHERE `resetId` = 26;
UPDATE `Control_Reinicio` SET `moduloId` = 27 WHERE `resetId` = 27;
UPDATE `Control_Reinicio` SET `moduloId` = 28 WHERE `resetId` = 28;
UPDATE `Control_Reinicio` SET `moduloId` = 29 WHERE `resetId` = 29;
UPDATE `Control_Reinicio` SET `moduloId` = 30 WHERE `resetId` = 30;
UPDATE `Control_Reinicio` SET `moduloId` = 31 WHERE `resetId` = 31;
UPDATE `Control_Reinicio` SET `moduloId` = 32 WHERE `resetId` = 32;
UPDATE `Control_Reinicio` SET `moduloId` = 33 WHERE `resetId` = 33;
UPDATE `Control_Reinicio` SET `moduloId` = 34 WHERE `resetId` = 34;
UPDATE `Control_Reinicio` SET `moduloId` = 35 WHERE `resetId` = 35;
UPDATE `Control_Reinicio` SET `moduloId` = 36 WHERE `resetId` = 36;
UPDATE `Control_Reinicio` SET `moduloId` = 37 WHERE `resetId` = 37;
UPDATE `Control_Reinicio` SET `moduloId` = 38 WHERE `resetId` = 38;
UPDATE `Control_Reinicio` SET `moduloId` = 39 WHERE `resetId` = 39;
UPDATE `Control_Reinicio` SET `moduloId` = 40 WHERE `resetId` = 40;
UPDATE `Control_Reinicio` SET `moduloId` = 41 WHERE `resetId` = 41;
UPDATE `Control_Reinicio` SET `moduloId` = 42 WHERE `resetId` = 42;
UPDATE `Control_Reinicio` SET `moduloId` = 43 WHERE `resetId` = 43;
UPDATE `Control_Reinicio` SET `moduloId` = 44 WHERE `resetId` = 44;
UPDATE `Control_Reinicio` SET `moduloId` = 45 WHERE `resetId` = 45;
UPDATE `Control_Reinicio` SET `moduloId` = 46 WHERE `resetId` = 46;
UPDATE `Control_Reinicio` SET `moduloId` = 47 WHERE `resetId` = 47;
UPDATE `Control_Reinicio` SET `moduloId` = 48 WHERE `resetId` = 48;
UPDATE `Control_Reinicio` SET `moduloId` = 49 WHERE `resetId` = 49;
UPDATE `Control_Reinicio` SET `moduloId` = 50 WHERE `resetId` = 50;
UPDATE `Control_Reinicio` SET `moduloId` = 31 WHERE `resetId` = 31;
UPDATE `Control_Reinicio` SET `moduloId` = 32 WHERE `resetId` = 32;
UPDATE `Control_Reinicio` SET `moduloId` = 33 WHERE `resetId` = 33;
UPDATE `Control_Reinicio` SET `moduloId` = 34 WHERE `resetId` = 34;
UPDATE `Control_Reinicio` SET `moduloId` = 35 WHERE `resetId` = 35;
UPDATE `Control_Reinicio` SET `moduloId` = 36 WHERE `resetId` = 36;
UPDATE `Control_Reinicio` SET `moduloId` = 37 WHERE `resetId` = 37;
UPDATE `Control_Reinicio` SET `moduloId` = 38 WHERE `resetId` = 38;
UPDATE `Control_Reinicio` SET `moduloId` = 39 WHERE `resetId` = 39;
UPDATE `Control_Reinicio` SET `moduloId` = 40 WHERE `resetId` = 40;
UPDATE `Control_Reinicio` SET `moduloId` = 41 WHERE `resetId` = 41;
UPDATE `Control_Reinicio` SET `moduloId` = 42 WHERE `resetId` = 42;
UPDATE `Control_Reinicio` SET `moduloId` = 43 WHERE `resetId` = 43;
UPDATE `Control_Reinicio` SET `moduloId` = 44 WHERE `resetId` = 44;
UPDATE `Control_Reinicio` SET `moduloId` = 45 WHERE `resetId` = 45;
UPDATE `Control_Reinicio` SET `moduloId` = 46 WHERE `resetId` = 46;
UPDATE `Control_Reinicio` SET `moduloId` = 47 WHERE `resetId` = 47;
UPDATE `Control_Reinicio` SET `moduloId` = 48 WHERE `resetId` = 48;
UPDATE `Control_Reinicio` SET `moduloId` = 49 WHERE `resetId` = 49;
UPDATE `Control_Reinicio` SET `moduloId` = 50 WHERE `resetId` = 50;
UPDATE `Control_Reinicio` SET `moduloId` = 51 WHERE `resetId` = 51;
UPDATE `Control_Reinicio` SET `moduloId` = 52 WHERE `resetId` = 52;
UPDATE `Control_Reinicio` SET `moduloId` = 53 WHERE `resetId` = 53;
UPDATE `Control_Reinicio` SET `moduloId` = 54 WHERE `resetId` = 54;
UPDATE `Control_Reinicio` SET `moduloId` = 55 WHERE `resetId` = 55;
UPDATE `Control_Reinicio` SET `moduloId` = 56 WHERE `resetId` = 56;
UPDATE `Control_Reinicio` SET `moduloId` = 57 WHERE `resetId` = 57;
UPDATE `Control_Reinicio` SET `moduloId` = 58 WHERE `resetId` = 58;
UPDATE `Control_Reinicio` SET `moduloId` = 59 WHERE `resetId` = 59;
UPDATE `Control_Reinicio` SET `moduloId` = 60 WHERE `resetId` = 60;
UPDATE `Control_Reinicio` SET `moduloId` = 61 WHERE `resetId` = 61;
UPDATE `Control_Reinicio` SET `moduloId` = 62 WHERE `resetId` = 62;
UPDATE `Control_Reinicio` SET `moduloId` = 63 WHERE `resetId` = 63;
UPDATE `Control_Reinicio` SET `moduloId` = 64 WHERE `resetId` = 64;


-- ===================================================================
-- 4: CREAR TODAS LAS CLAVES FORÁNEAS
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
-- 5: CREAR LA VISTA
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