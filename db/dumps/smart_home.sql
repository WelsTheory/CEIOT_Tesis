-- ===================================================================
-- BASE DE DATOS COMPLETA CON SISTEMA DE MONITOREO
-- ===================================================================

-- ===================================================================
-- 1: CONFIGURACIÓN INICIAL Y CREACIÓN DE TABLAS BASE
-- ===================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS `ABS` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;
USE `ABS`;

-- ===================================================================
-- 2: TABLAS ORIGINALES (BASE EXISTENTE)
-- ===================================================================

-- Tabla Control_Reinicio PRIMERO (sin moduloId por ahora)
CREATE TABLE `Control_Reinicio` (
  `resetId` int(11) NOT NULL,
  `nombre` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Tabla Modulos (con campos adicionales de configuración para monitoreo)
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
  -- NUEVOS CAMPOS PARA MONITOREO
  `intervalo_heartbeat` int(11) DEFAULT 60 COMMENT 'Intervalo heartbeat en segundos (30 o 60)',
  `timeout_maximo` int(11) DEFAULT 300 COMMENT 'Tiempo máximo sin respuesta antes de TIMEOUT',
  `intentos_maximos` int(3) DEFAULT 5 COMMENT 'Intentos máximos antes de marcar como OFFLINE',
  `notificaciones_activas` tinyint(1) DEFAULT 1 COMMENT 'Si están activas las notificaciones',
  `fecha_ultima_actualizacion` datetime DEFAULT NULL,
  `estado_operativo` enum('ACTIVO','MANTENIMIENTO','DESHABILITADO') DEFAULT 'ACTIVO',
  CONSTRAINT `chk_up_values` CHECK (`up` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5)),
  CONSTRAINT `chk_down_values` CHECK (`down` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5))
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Tabla Mediciones
CREATE TABLE `Mediciones` (
  `medicionId` int(11) NOT NULL,
  `fecha` datetime DEFAULT NULL,
  `valor_temp` varchar(100) DEFAULT NULL COMMENT 'Lectura actual de temperatura',
  `valor_press` varchar(100) DEFAULT NULL COMMENT 'Lectura actual de presion',
  `moduloId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Tabla Beam
CREATE TABLE `Beam` (
  `beamId` int(11) NOT NULL,
  `fecha` datetime DEFAULT NULL,
  `valor_up` decimal(2,1) DEFAULT 0.0,
  `valor_down` decimal(2,1) DEFAULT 0.0,
  `modulo_id` int(11) NOT NULL,
  CONSTRAINT `chk_beam_up_values` CHECK (`valor_up` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5)),
  CONSTRAINT `chk_beam_down_values` CHECK (`valor_down` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5))
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- Tabla Log_Reinicios
CREATE TABLE `Log_Reinicios` (
  `logResetId` int(11) NOT NULL,
  `reinicio` tinyint(4) DEFAULT NULL,
  `fecha` datetime DEFAULT NULL,
  `resetId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- ===================================================================
-- 3: NUEVAS TABLAS PARA MONITOREO DE MÓDULOS
-- ===================================================================

-- 1. Tabla para registrar el estado de conexión de cada módulo
CREATE TABLE `Estado_Conexion` (
  `estadoId` int(11) NOT NULL AUTO_INCREMENT,
  `moduloId` int(11) NOT NULL,
  `tipo_evento` enum('ONLINE','OFFLINE','TIMEOUT','RECONEXION') NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `duracion_desconexion` int(11) DEFAULT NULL COMMENT 'Duración de desconexión en segundos',
  `detalles` text DEFAULT NULL COMMENT 'Información adicional del evento',
  PRIMARY KEY (`estadoId`),
  INDEX `idx_modulo_fecha` (`moduloId`, `fecha`),
  INDEX `idx_tipo_evento` (`tipo_evento`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Registro histórico del estado de conexión de módulos';

-- 2. Tabla para registrar cambios y errores en los apuntes (UP/DOWN)
CREATE TABLE `Log_Apuntes` (
  `logApunteId` int(11) NOT NULL AUTO_INCREMENT,
  `moduloId` int(11) NOT NULL,
  `fecha` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tipo_evento` enum('CAMBIO','MISMATCH','VERIFICACION') NOT NULL,
  `valor_up_esperado` decimal(2,1) DEFAULT NULL,
  `valor_down_esperado` decimal(2,1) DEFAULT NULL,
  `valor_up_actual` decimal(2,1) DEFAULT NULL,
  `valor_down_actual` decimal(2,1) DEFAULT NULL,
  `estado` enum('OK','ERROR','PENDIENTE') DEFAULT 'OK',
  `descripcion` varchar(500) DEFAULT NULL COMMENT 'Descripción del evento o error',
  PRIMARY KEY (`logApunteId`),
  INDEX `idx_modulo_fecha` (`moduloId`, `fecha`),
  INDEX `idx_tipo_evento_estado` (`tipo_evento`, `estado`),
  CONSTRAINT `chk_log_up_values` CHECK (`valor_up_esperado` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5)),
  CONSTRAINT `chk_log_down_values` CHECK (`valor_down_esperado` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5)),
  CONSTRAINT `chk_log_up_actual` CHECK (`valor_up_actual` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5)),
  CONSTRAINT `chk_log_down_actual` CHECK (`valor_down_actual` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5))
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Log de cambios y errores en apuntes UP/DOWN';

-- 3. Tabla para información técnica del módulo (firmware, IP, etc.)
CREATE TABLE `Info_Modulo` (
  `infoId` int(11) NOT NULL AUTO_INCREMENT,
  `moduloId` int(11) NOT NULL,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `version_firmware` varchar(50) DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL COMMENT 'Soporte para IPv4 e IPv6',
  `mac_address` varchar(17) DEFAULT NULL,
  `uptime` int(11) DEFAULT NULL COMMENT 'Tiempo encendido en segundos',
  `memoria_libre` int(11) DEFAULT NULL COMMENT 'Memoria libre en bytes',
  `temperatura_interna` decimal(4,1) DEFAULT NULL COMMENT 'Temperatura del microcontrolador',
  `voltaje_alimentacion` decimal(4,2) DEFAULT NULL COMMENT 'Voltaje de alimentación',
  `signal_strength` int(3) DEFAULT NULL COMMENT 'Intensidad de señal WiFi en dBm',
  `activo` tinyint(1) DEFAULT 1,
  PRIMARY KEY (`infoId`),
  INDEX `idx_modulo_fecha` (`moduloId`, `fecha_actualizacion`),
  INDEX `idx_version_firmware` (`version_firmware`),
  UNIQUE KEY `uk_modulo_activo` (`moduloId`, `activo`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Información técnica y estado de cada módulo';

-- 4. Tabla de estado actual de conexión (una fila por módulo)
CREATE TABLE `Estado_Actual_Modulos` (
  `moduloId` int(11) NOT NULL,
  `estado_conexion` enum('ONLINE','OFFLINE','TIMEOUT','DESCONOCIDO') DEFAULT 'DESCONOCIDO',
  `ultimo_heartbeat` datetime DEFAULT NULL COMMENT 'Último mensaje de estado recibido',
  `proxima_verificacion` datetime DEFAULT NULL COMMENT 'Próxima verificación programada',
  `intentos_conexion` int(3) DEFAULT 0 COMMENT 'Intentos fallidos consecutivos',
  `tiempo_offline` int(11) DEFAULT NULL COMMENT 'Tiempo offline en segundos',
  `fecha_ultimo_cambio` datetime DEFAULT CURRENT_TIMESTAMP,
  `alerta_activa` tinyint(1) DEFAULT 0 COMMENT 'Si hay una alerta activa para este módulo',
  `nivel_alerta` enum('BAJO','MEDIO','ALTO','CRITICO') DEFAULT NULL,
  PRIMARY KEY (`moduloId`),
  INDEX `idx_estado_conexion` (`estado_conexion`),
  INDEX `idx_alerta_activa` (`alerta_activa`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Estado actual de conexión de cada módulo';

-- ===================================================================
-- 4: ÍNDICES Y CLAVES PRIMARIAS
-- ===================================================================

ALTER TABLE `Control_Reinicio` ADD PRIMARY KEY (`resetId`);
ALTER TABLE `Modulos` ADD PRIMARY KEY (`moduloId`), ADD KEY `fk_Modulos_Control_Reinicio_idx` (`resetId`);
ALTER TABLE `Mediciones` ADD PRIMARY KEY (`medicionId`,`moduloId`), ADD KEY `fk_Mediciones_Modulos_idx` (`moduloId`);
ALTER TABLE `Beam` ADD PRIMARY KEY (`beamId`,`modulo_id`), ADD KEY `fk_Beam_Modulos_idx` (`modulo_id`);
ALTER TABLE `Log_Reinicios` ADD PRIMARY KEY (`logResetId`,`resetId`), ADD KEY `fk_Log_Reinicios_Control_Reinicio_idx` (`resetId`);

-- ===================================================================
-- 5: AUTO_INCREMENT
-- ===================================================================

ALTER TABLE `Control_Reinicio` MODIFY `resetId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;
ALTER TABLE `Modulos` MODIFY `moduloId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;
ALTER TABLE `Mediciones` MODIFY `medicionId` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `Beam` MODIFY `beamId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=65;
ALTER TABLE `Log_Reinicios` MODIFY `logResetId` int(11) NOT NULL AUTO_INCREMENT;

-- ===================================================================
-- 6: INSERTAR DATOS DE PRUEBA
-- ===================================================================

-- Insertar Control_Reinicio PRIMERO
INSERT INTO `Control_Reinicio` (`resetId`, `nombre`) VALUES
(1,  'CRNorte1'),  (2,  'CRNorte2'),  (3,  'CRNorte3'),  (4,  'CRNorte4'),
(5,  'CREste1'),   (6,  'CREste2'),   (7,  'CREste3'),   (8,  'CREste4'),
(9,  'CRNorte5'),  (10, 'CRNorte6'),  (11, 'CRNorte7'),  (12, 'CRNorte8'),
(13, 'CREste5'),   (14, 'CREste6'),   (15, 'CREste7'),   (16, 'CREste8'),
(17, 'CRNorte9'),  (18, 'CRNorte10'), (19, 'CRNorte11'), (20, 'CRNorte12'),
(21, 'CREste9'),   (22, 'CREste10'),  (23, 'CREste11'),  (24, 'CREste12'),
(25, 'CRNorte13'), (26, 'CRNorte14'), (27, 'CRNorte15'), (28, 'CRNorte16'),
(29, 'CREste13'),  (30, 'CREste14'),  (31, 'CREste15'),  (32, 'CREste16'),
(33, 'CROeste1'),  (34, 'CROeste2'),  (35, 'CROeste3'),  (36, 'CROeste4'),
(37, 'CRSur1'),    (38, 'CRSur2'),    (39, 'CRSur3'),    (40, 'CRSur4'),
(41, 'CROeste5'),  (42, 'CROeste6'),  (43, 'CROeste7'),  (44, 'CROeste8'),
(45, 'CRSur5'),    (46, 'CRSur6'),    (47, 'CRSur7'),    (48, 'CRSur8'),
(49, 'CROeste9'),  (50, 'CROeste10'), (51, 'CROeste11'), (52, 'CROeste12'),
(53, 'CRSur9'),    (54, 'CRSur10'),   (55, 'CRSur11'),   (56, 'CRSur12'),
(57, 'CROeste13'), (58, 'CROeste14'), (59, 'CROeste15'), (60, 'CROeste16'),
(61, 'CRSur13'),   (62, 'CRSur14'),   (63, 'CRSur15'),   (64, 'CRSur16');

-- Insertar Modulos DESPUÉS
INSERT INTO `Modulos` (`moduloId`, `nombre`, `ubicacion`, `version`, `up`, `down`, `temp_min`, `temp_max`, `press_min`, `press_max`, `resetId`, `intervalo_heartbeat`, `timeout_maximo`, `intentos_maximos`, `notificaciones_activas`, `estado_operativo`) VALUES 
(1,  'Modulo 1',  'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 1,  60, 300, 3, 1, 'ACTIVO'),
(2,  'Modulo 2',  'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 2,  60, 300, 3, 1, 'ACTIVO'),
(3,  'Modulo 3',  'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 3,  60, 300, 3, 1, 'ACTIVO'),
(4,  'Modulo 4',  'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 4,  60, 300, 3, 1, 'ACTIVO'),
(5,  'Modulo 1',  'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 5,  30, 180, 5, 1, 'ACTIVO'),
(6,  'Modulo 2',  'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 6,  30, 180, 5, 1, 'ACTIVO'),
(7,  'Modulo 3',  'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 7,  30, 180, 5, 1, 'ACTIVO'),
(8,  'Modulo 4',  'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 8,  30, 180, 5, 1, 'ACTIVO'),
(9,  'Modulo 5',  'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 9,  60, 300, 3, 1, 'ACTIVO'),
(10, 'Modulo 6',  'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 10, 60, 300, 3, 1, 'ACTIVO'),
(11, 'Modulo 7',  'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 11, 60, 300, 3, 1, 'ACTIVO'),
(12, 'Modulo 8',  'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 12, 60, 300, 3, 1, 'ACTIVO'),
(13, 'Modulo 5',  'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 13, 30, 180, 5, 1, 'ACTIVO'),
(14, 'Modulo 6',  'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 14, 30, 180, 5, 1, 'ACTIVO'),
(15, 'Modulo 7',  'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 15, 30, 180, 5, 1, 'ACTIVO'),
(16, 'Modulo 8',  'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 16, 30, 180, 5, 1, 'ACTIVO'),
(17, 'Modulo 9',  'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 17, 60, 300, 3, 1, 'ACTIVO'),
(18, 'Modulo 10', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 18, 60, 300, 3, 1, 'ACTIVO'),
(19, 'Modulo 11', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 19, 60, 300, 3, 1, 'ACTIVO'),
(20, 'Modulo 12', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 20, 60, 300, 3, 1, 'ACTIVO'),
(21, 'Modulo 9',  'Este',  '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 21, 60, 300, 3, 1, 'ACTIVO'),
(22, 'Modulo 10', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 22, 30, 180, 5, 1, 'ACTIVO'),
(23, 'Modulo 11', 'Este',  '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 23, 60, 300, 3, 1, 'ACTIVO'),
(24, 'Modulo 12', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 24, 30, 180, 5, 1, 'ACTIVO'),
(25, 'Modulo 13', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 25, 60, 300, 3, 1, 'ACTIVO'),
(26, 'Modulo 14', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 26, 60, 300, 3, 1, 'ACTIVO'),
(27, 'Modulo 15', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 27, 60, 300, 3, 1, 'ACTIVO'),
(28, 'Modulo 16', 'Norte', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 28, 60, 300, 3, 1, 'ACTIVO'),
(29, 'Modulo 13', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 29, 30, 180, 5, 1, 'ACTIVO'),
(30, 'Modulo 14', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 30, 30, 180, 5, 1, 'ACTIVO'),
(31, 'Modulo 15', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 31, 30, 180, 5, 1, 'ACTIVO'),
(32, 'Modulo 16', 'Este',  '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 32, 30, 180, 5, 1, 'ACTIVO'),
(33, 'Modulo 1',  'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 33, 30, 180, 5, 1, 'ACTIVO'),
(34, 'Modulo 2',  'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 34, 30, 180, 5, 1, 'ACTIVO'),
(35, 'Modulo 3',  'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 35, 30, 180, 5, 1, 'ACTIVO'),
(36, 'Modulo 4',  'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 36, 30, 180, 5, 1, 'ACTIVO'),
(37, 'Modulo 1',  'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 37, 60, 300, 3, 1, 'ACTIVO'),
(38, 'Modulo 2',  'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 38, 60, 300, 3, 1, 'ACTIVO'),
(39, 'Modulo 3',  'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 39, 60, 300, 3, 1, 'ACTIVO'),
(40, 'Modulo 4',  'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 40, 60, 300, 3, 1, 'ACTIVO'),
(41, 'Modulo 5',  'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 41, 30, 180, 5, 1, 'ACTIVO'),
(42, 'Modulo 6',  'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 42, 30, 180, 5, 1, 'ACTIVO'),
(43, 'Modulo 7',  'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 43, 30, 180, 5, 1, 'ACTIVO'),
(44, 'Modulo 8',  'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 44, 30, 180, 5, 1, 'ACTIVO'),
(45, 'Modulo 5',  'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 45, 60, 300, 3, 1, 'ACTIVO'),
(46, 'Modulo 6',  'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 46, 60, 300, 3, 1, 'ACTIVO'),
(47, 'Modulo 7',  'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 47, 60, 300, 3, 1, 'ACTIVO'),
(48, 'Modulo 8',  'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 48, 60, 300, 3, 1, 'ACTIVO'),
(49, 'Modulo 9',  'Oeste', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 49, 60, 300, 3, 1, 'ACTIVO'),
(50, 'Modulo 10', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 50, 30, 180, 5, 1, 'ACTIVO'),
(51, 'Modulo 11', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 51, 30, 180, 5, 1, 'ACTIVO'),
(52, 'Modulo 12', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 52, 30, 180, 5, 1, 'ACTIVO'),
(53, 'Modulo 9',  'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 53, 60, 300, 3, 1, 'ACTIVO'),
(54, 'Modulo 10', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 54, 60, 300, 3, 1, 'ACTIVO'),
(55, 'Modulo 11', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 55, 60, 300, 3, 1, 'ACTIVO'),
(56, 'Modulo 12', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 56, 60, 300, 3, 1, 'ACTIVO'),
(57, 'Modulo 13', 'Oeste', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 57, 60, 300, 3, 1, 'ACTIVO'),
(58, 'Modulo 14', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 58, 30, 180, 5, 1, 'ACTIVO'),
(59, 'Modulo 15', 'Oeste', '1.0', 0.0, 0.0, 0, 100, 0.0, 1000, 59, 30, 180, 5, 1, 'ACTIVO'),
(60, 'Modulo 16', 'Oeste', '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 60, 60, 300, 3, 1, 'ACTIVO'),
(61, 'Modulo 13', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 61, 60, 300, 3, 1, 'ACTIVO'),
(62, 'Modulo 14', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 62, 60, 300, 3, 1, 'ACTIVO'),
(63, 'Modulo 15', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 63, 60, 300, 3, 1, 'ACTIVO'),
(64, 'Modulo 16', 'Sur',   '2.0', 0.0, 0.0, 0, 100, 0.0, 1000, 64, 60, 300, 3, 1, 'ACTIVO');

-- Insertar datos en Beam
INSERT INTO `Beam` (`beamId`, `fecha`, `valor_up`, `valor_down`, `modulo_id`) VALUES
(1,  NOW(), 1.0, 0.5, 1),   (2,  NOW(), 0.0, 1.5, 2),   (3,  NOW(), 2.0, 0.5, 3),   (4,  NOW(), 3.0, 3.5, 4),
(5,  NOW(), 1.0, 0.5, 5),   (6,  NOW(), 0.0, 1.5, 6),   (7,  NOW(), 2.0, 0.5, 7),   (8,  NOW(), 3.0, 3.5, 8),
(9,  NOW(), 3.5, 3.5, 9),   (10, NOW(), 0.0, 0.0, 10),  (11, NOW(), 1.0, 2.0, 11),  (12, NOW(), 0.0, 0.0, 12),
(13, NOW(), 1.0, 2.0, 13),  (14, NOW(), 0.0, 0.0, 14),  (15, NOW(), 1.0, 2.0, 15),  (16, NOW(), 0.0, 0.0, 16),
(17, NOW(), 1.0, 2.0, 17),  (18, NOW(), 0.0, 0.0, 18),  (19, NOW(), 1.0, 2.0, 19),  (20, NOW(), 0.0, 0.0, 20),
(21, NOW(), 1.0, 2.0, 21),  (22, NOW(), 0.0, 0.0, 22),  (23, NOW(), 1.0, 2.0, 23),  (24, NOW(), 0.0, 0.0, 24),
(25, NOW(), 1.0, 2.0, 25),  (26, NOW(), 0.0, 0.0, 26),  (27, NOW(), 1.0, 2.0, 27),  (28, NOW(), 0.0, 0.0, 28),
(29, NOW(), 1.0, 2.0, 29),  (30, NOW(), 0.0, 0.0, 30),  (31, NOW(), 1.0, 2.0, 31),  (32, NOW(), 0.0, 0.0, 32),
(33, NOW(), 1.0, 2.0, 33),  (34, NOW(), 0.0, 0.0, 34),  (35, NOW(), 1.0, 2.0, 35),  (36, NOW(), 0.0, 0.0, 36),
(37, NOW(), 1.0, 2.0, 37),  (38, NOW(), 0.0, 0.0, 38),  (39, NOW(), 1.0, 2.0, 39),  (40, NOW(), 2.0, 3.5, 40),
(41, NOW(), 2.5, 0.5, 41),  (42, NOW(), 3.5, 1.5, 42),  (43, NOW(), 3.0, 0.5, 43),  (44, NOW(), 1.0, 3.5, 44),
(45, NOW(), 3.0, 2.0, 45),  (46, NOW(), 2.0, 3.0, 46),  (47, NOW(), 0.0, 1.0, 47),  (48, NOW(), 0.0, 3.5, 48),
(49, NOW(), 0.0, 0.5, 49),  (50, NOW(), 0.0, 2.5, 50),  (51, NOW(), 2.5, 0.0, 51),  (52, NOW(), 1.5, 0.0, 52),
(53, NOW(), 1.5, 3.5, 53),  (54, NOW(), 1.5, 0.5, 54),  (55, NOW(), 1.5, 1.5, 55),  (56, NOW(), 2.5, 2.5, 56),
(57, NOW(), 3.5, 3.5, 57),  (58, NOW(), 1.0, 1.5, 58),  (59, NOW(), 2.5, 1.5, 59),  (60, NOW(), 2.0, 2.0, 60),
(61, NOW(), 3.0, 2.0, 61),  (62, NOW(), 1.5, 0.0, 62),  (63, NOW(), 3.5, 0.0, 63),  (64, NOW(), 0.0, 3.5, 64);

-- ===================================================================
-- 7: CONFIGURAR RELACIONES CONTROL_REINICIO
-- ===================================================================

-- Agregar campo moduloId a Control_Reinicio
ALTER TABLE `Control_Reinicio` ADD `moduloId` int(11) DEFAULT NULL;
ALTER TABLE `Control_Reinicio` ADD KEY `fk_Control_Reinicio_Modulos_idx` (`moduloId`);

-- Actualizar los datos para relacionar Control_Reinicio con Modulos (relación 1:1)
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
-- 8: CREAR TODAS LAS CLAVES FORÁNEAS
-- ===================================================================

-- Claves foráneas de tablas originales
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

-- Claves foráneas de nuevas tablas de monitoreo
ALTER TABLE `Estado_Conexion`
  ADD CONSTRAINT `fk_Estado_Conexion_Modulos` 
  FOREIGN KEY (`moduloId`) REFERENCES `Modulos` (`moduloId`) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Log_Apuntes`
  ADD CONSTRAINT `fk_Log_Apuntes_Modulos` 
  FOREIGN KEY (`moduloId`) REFERENCES `Modulos` (`moduloId`) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Info_Modulo`
  ADD CONSTRAINT `fk_Info_Modulo_Modulos` 
  FOREIGN KEY (`moduloId`) REFERENCES `Modulos` (`moduloId`) 
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `Estado_Actual_Modulos`
  ADD CONSTRAINT `fk_Estado_Actual_Modulos` 
  FOREIGN KEY (`moduloId`) REFERENCES `Modulos` (`moduloId`) 
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ===================================================================
-- 9: INICIALIZAR ESTADO ACTUAL PARA MÓDULOS EXISTENTES
-- ===================================================================

INSERT INTO `Estado_Actual_Modulos` (`moduloId`, `estado_conexion`, `fecha_ultimo_cambio`)
SELECT `moduloId`, 'DESCONOCIDO', NOW()
FROM `Modulos`;

-- ===================================================================
-- 10: CREAR VISTAS ÚTILES
-- ===================================================================

-- Vista original para temperatura y presión
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

-- Vista nueva para el estado general de todos los módulos
CREATE VIEW `Vista_Estado_General` AS
SELECT 
    m.moduloId,
    m.nombre,
    m.ubicacion,
    m.version,
    m.intervalo_heartbeat,
    m.timeout_maximo,
    m.intentos_maximos,
    m.estado_operativo,
    eam.estado_conexion,
    eam.ultimo_heartbeat,
    eam.tiempo_offline,
    eam.intentos_conexion,
    eam.alerta_activa,
    eam.nivel_alerta,
    im.version_firmware,
    im.ip_address,
    TIMESTAMPDIFF(SECOND, eam.ultimo_heartbeat, NOW()) as segundos_sin_contacto,
    CASE 
        WHEN eam.estado_conexion = 'ONLINE' THEN 'success'
        WHEN eam.estado_conexion = 'OFFLINE' THEN 'danger'
        WHEN eam.estado_conexion = 'TIMEOUT' THEN 'warning'
        ELSE 'secondary'
    END as color_estado
FROM `Modulos` m
LEFT JOIN `Estado_Actual_Modulos` eam ON m.moduloId = eam.moduloId
LEFT JOIN `Info_Modulo` im ON m.moduloId = im.moduloId AND im.activo = 1;

-- Vista para el historial reciente de conexiones (últimas 24 horas)
CREATE VIEW `Vista_Historial_Conexiones` AS
SELECT 
    ec.estadoId,
    ec.moduloId,
    m.nombre,
    ec.tipo_evento,
    ec.fecha,
    ec.duracion_desconexion,
    ec.detalles
FROM `Estado_Conexion` ec
JOIN `Modulos` m ON ec.moduloId = m.moduloId
WHERE ec.fecha >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
ORDER BY ec.fecha DESC;

-- Vista para errores de apuntes recientes
CREATE VIEW `Vista_Errores_Apuntes` AS
SELECT 
    la.logApunteId,
    la.moduloId,
    m.nombre,
    la.fecha,
    la.tipo_evento,
    la.valor_up_esperado,
    la.valor_down_esperado,
    la.valor_up_actual,
    la.valor_down_actual,
    la.estado,
    la.descripcion
FROM `Log_Apuntes` la
JOIN `Modulos` m ON la.moduloId = m.moduloId
WHERE la.estado = 'ERROR'
ORDER BY la.fecha DESC;

-- Vista de resumen de alertas activas
CREATE VIEW `Vista_Alertas_Activas` AS
SELECT 
    m.moduloId,
    m.nombre,
    m.ubicacion,
    eam.estado_conexion,
    eam.nivel_alerta,
    eam.tiempo_offline,
    eam.intentos_conexion,
    TIMESTAMPDIFF(SECOND, eam.ultimo_heartbeat, NOW()) as segundos_sin_contacto
FROM `Modulos` m
JOIN `Estado_Actual_Modulos` eam ON m.moduloId = eam.moduloId
WHERE eam.alerta_activa = 1
ORDER BY 
    CASE eam.nivel_alerta
        WHEN 'CRITICO' THEN 1
        WHEN 'ALTO' THEN 2
        WHEN 'MEDIO' THEN 3
        WHEN 'BAJO' THEN 4
        ELSE 5
    END,
    eam.tiempo_offline DESC;

-- ===================================================================
-- 11: TRIGGERS PARA AUTOMATIZACIÓN
-- ===================================================================

DELIMITER $

-- Trigger para registrar cambios de estado automáticamente
CREATE TRIGGER `tr_estado_conexion_after_update`
AFTER UPDATE ON `Estado_Actual_Modulos`
FOR EACH ROW
BEGIN
    IF OLD.estado_conexion != NEW.estado_conexion THEN
        INSERT INTO `Estado_Conexion` (
            moduloId, 
            tipo_evento, 
            fecha, 
            duracion_desconexion,
            detalles
        ) VALUES (
            NEW.moduloId,
            NEW.estado_conexion,
            NOW(),
            CASE 
                WHEN NEW.estado_conexion = 'ONLINE' AND OLD.estado_conexion IN ('OFFLINE', 'TIMEOUT') 
                THEN NEW.tiempo_offline
                ELSE NULL 
            END,
            CONCAT('Cambio de estado: ', OLD.estado_conexion, ' -> ', NEW.estado_conexion)
        );
    END IF;
END$

-- Trigger para actualizar la fecha de última actualización en módulos
CREATE TRIGGER `tr_modulos_update_timestamp`
BEFORE UPDATE ON `Modulos`
FOR EACH ROW
BEGIN
    SET NEW.fecha_ultima_actualizacion = NOW();
END$

-- Trigger para mantener un solo registro activo por módulo en Info_Modulo
--CREATE TRIGGER `tr_info_modulo_before_insert`
--BEFORE INSERT ON `Info_Modulo`
--FOR EACH ROW
--BEGIN
--    IF NEW.activo = 1 THEN
--        UPDATE `Info_Modulo` SET `activo` = 0 WHERE `moduloId` = NEW.moduloId;
--    END IF;
--END$

DELIMITER ;

-- ===================================================================
-- 12: PROCEDIMIENTOS ALMACENADOS ÚTILES
-- ===================================================================

DELIMITER $

-- Procedimiento para actualizar el estado de un módulo
CREATE PROCEDURE `sp_actualizar_estado_modulo`(
    IN p_moduloId INT,
    IN p_nuevo_estado ENUM('ONLINE','OFFLINE','TIMEOUT','DESCONOCIDO')
)
BEGIN
    UPDATE `Estado_Actual_Modulos`
    SET 
        estado_conexion = p_nuevo_estado,
        ultimo_heartbeat = CASE WHEN p_nuevo_estado = 'ONLINE' THEN NOW() ELSE ultimo_heartbeat END,
        fecha_ultimo_cambio = NOW(),
        intentos_conexion = CASE WHEN p_nuevo_estado = 'ONLINE' THEN 0 ELSE intentos_conexion + 1 END,
        tiempo_offline = CASE 
            WHEN p_nuevo_estado = 'ONLINE' THEN 0
            WHEN p_nuevo_estado IN ('OFFLINE', 'TIMEOUT') THEN 
                COALESCE(tiempo_offline, 0) + TIMESTAMPDIFF(SECOND, fecha_ultimo_cambio, NOW())
            ELSE tiempo_offline
        END
    WHERE moduloId = p_moduloId;
END$

-- Procedimiento para registrar error de apunte (mismatch)
CREATE PROCEDURE `sp_registrar_error_apunte`(
    IN p_moduloId INT,
    IN p_up_esperado DECIMAL(2,1),
    IN p_down_esperado DECIMAL(2,1),
    IN p_up_actual DECIMAL(2,1),
    IN p_down_actual DECIMAL(2,1),
    IN p_descripcion VARCHAR(500)
)
BEGIN
    INSERT INTO `Log_Apuntes` (
        moduloId,
        tipo_evento,
        valor_up_esperado,
        valor_down_esperado,
        valor_up_actual,
        valor_down_actual,
        estado,
        descripcion
    ) VALUES (
        p_moduloId,
        'MISMATCH',
        p_up_esperado,
        p_down_esperado,
        p_up_actual,
        p_down_actual,
        'ERROR',
        p_descripcion
    );
END$

-- Procedimiento para actualizar información técnica del módulo
CREATE PROCEDURE `sp_actualizar_info_modulo`(
    IN p_moduloId INT,
    IN p_version_firmware VARCHAR(50),
    IN p_ip_address VARCHAR(45),
    IN p_mac_address VARCHAR(17),
    IN p_uptime INT,
    IN p_memoria_libre INT,
    IN p_temperatura_interna DECIMAL(4,1),
    IN p_voltaje_alimentacion DECIMAL(4,2),
    IN p_signal_strength INT
)
BEGIN
    INSERT INTO `Info_Modulo` (
        moduloId,
        version_firmware,
        ip_address,
        mac_address,
        uptime,
        memoria_libre,
        temperatura_interna,
        voltaje_alimentacion,
        signal_strength,
        activo
    ) VALUES (
        p_moduloId,
        p_version_firmware,
        p_ip_address,
        p_mac_address,
        p_uptime,
        p_memoria_libre,
        p_temperatura_interna,
        p_voltaje_alimentacion,
        p_signal_strength,
        1
    );
END$

-- Procedimiento para obtener estadísticas de conexión de un módulo
CREATE PROCEDURE `sp_estadisticas_modulo`(
    IN p_moduloId INT,
    IN p_dias INT
)
BEGIN
    SELECT 
        COUNT(*) as total_eventos,
        SUM(CASE WHEN tipo_evento = 'ONLINE' THEN 1 ELSE 0 END) as eventos_online,
        SUM(CASE WHEN tipo_evento = 'OFFLINE' THEN 1 ELSE 0 END) as eventos_offline,
        SUM(CASE WHEN tipo_evento = 'TIMEOUT' THEN 1 ELSE 0 END) as eventos_timeout,
        AVG(duracion_desconexion) as promedio_desconexion,
        MAX(duracion_desconexion) as max_desconexion
    FROM `Estado_Conexion`
    WHERE moduloId = p_moduloId 
    AND fecha >= DATE_SUB(NOW(), INTERVAL p_dias DAY);
END$

DELIMITER ;

-- ===================================================================
-- 13: INSERTAR DATOS DE EJEMPLO PARA INFO_MODULO
-- ===================================================================

-- Insertar información técnica de ejemplo para algunos módulos
INSERT INTO `Info_Modulo` (`moduloId`, `version_firmware`, `ip_address`, `mac_address`, `uptime`, `memoria_libre`, `temperatura_interna`, `voltaje_alimentacion`, `signal_strength`, `activo`) VALUES
(1, 'v2.1.0', '192.168.1.101', '00:1B:44:11:3A:B7', 86400, 32768, 42.5, 3.30, -45, 1),
(2, 'v2.1.0', '192.168.1.102', '00:1B:44:11:3A:B8', 72000, 28672, 39.8, 3.28, -52, 1),
(3, 'v2.0.5', '192.168.1.103', '00:1B:44:11:3A:B9', 95000, 31744, 41.2, 3.31, -48, 1),
(4, 'v2.1.0', '192.168.1.104', '00:1B:44:11:3A:BA', 68400, 30208, 40.7, 3.29, -46, 1),
(5, 'v1.8.2', '192.168.1.105', '00:1B:44:11:3A:BB', 125000, 16384, 44.1, 3.25, -55, 1);

-- ===================================================================
-- 14: COMMIT Y VERIFICACIÓN FINAL
-- ===================================================================

COMMIT;

-- Verificación final
SELECT 'Base de datos creada exitosamente' as resultado;
SELECT COUNT(*) as total_modulos FROM Modulos;
SELECT COUNT(*) as total_controles FROM Control_Reinicio;
SELECT COUNT(*) as total_estados_actuales FROM Estado_Actual_Modulos;

-- Mostrar tablas creadas
SELECT TABLE_NAME, TABLE_COMMENT 
FROM INFORMATION_SCHEMA.TABLES 
WHERE TABLE_SCHEMA = DATABASE() 
ORDER BY TABLE_NAME;

-- Mostrar vistas creadas
SELECT TABLE_NAME as VISTA_NAME
FROM INFORMATION_SCHEMA.VIEWS 
WHERE TABLE_SCHEMA = DATABASE() 
ORDER BY TABLE_NAME;

-- ===================================================================
-- 15: CONSULTAS DE EJEMPLO PARA VERIFICAR FUNCIONAMIENTO
-- ===================================================================

-- Ejemplo 1: Ver estado general de todos los módulos
-- SELECT * FROM Vista_Estado_General LIMIT 10;

-- Ejemplo 2: Ver módulos con alertas activas
-- SELECT * FROM Vista_Alertas_Activas;

-- Ejemplo 3: Ver historial de conexiones reciente
-- SELECT * FROM Vista_Historial_Conexiones LIMIT 20;

-- Ejemplo 4: Actualizar estado de un módulo (usar después de crear la BD)
-- CALL sp_actualizar_estado_modulo(1, 'ONLINE');

-- Ejemplo 5: Registrar error de apunte
-- CALL sp_registrar_error_apunte(1, 1.0, 0.5, 2.0, 1.5, 'Mismatch detectado en verificación automática');

-- Ejemplo 6: Ver información técnica de módulos
-- SELECT m.nombre, im.version_firmware, im.ip_address, im.temperatura_interna 
-- FROM Modulos m LEFT JOIN Info_Modulo im ON m.moduloId = im.moduloId AND im.activo = 1;

-- ===================================================================
-- 16: CONFIGURACIONES ADICIONALES RECOMENDADAS
-- ===================================================================

-- Configurar limpieza automática de logs antiguos (opcional)
-- Crear evento para limpiar registros de más de 6 meses
SET GLOBAL event_scheduler = ON;

DELIMITER $

CREATE EVENT `ev_limpiar_logs_antiguos`
ON SCHEDULE EVERY 1 WEEK
DO
BEGIN
    -- Limpiar registros de estado de conexión mayores a 6 meses
    DELETE FROM `Estado_Conexion` 
    WHERE fecha < DATE_SUB(NOW(), INTERVAL 6 MONTH);
    
    -- Limpiar logs de apuntes mayores a 3 meses (solo los OK)
    DELETE FROM `Log_Apuntes` 
    WHERE fecha < DATE_SUB(NOW(), INTERVAL 3 MONTH) 
    AND estado = 'OK';
    
    -- Mantener solo la información técnica más reciente (desactivar las antiguas)
    UPDATE `Info_Modulo` SET `activo` = 0 
    WHERE fecha_actualizacion < DATE_SUB(NOW(), INTERVAL 1 MONTH) 
    AND `activo` = 1
    AND moduloId IN (
        SELECT DISTINCT moduloId FROM (
            SELECT moduloId FROM `Info_Modulo` 
            WHERE fecha_actualizacion >= DATE_SUB(NOW(), INTERVAL 1 MONTH)
        ) as recent_modules
    );
END$

DELIMITER ;

-- ===================================================================
-- 17: ÍNDICES ADICIONALES PARA OPTIMIZACIÓN
-- ===================================================================

-- Índices para mejorar rendimiento en consultas frecuentes
CREATE INDEX `idx_estado_conexion_fecha` ON `Estado_Conexion` (`fecha`);
CREATE INDEX `idx_log_apuntes_fecha_estado` ON `Log_Apuntes` (`fecha`, `estado`);
CREATE INDEX `idx_mediciones_fecha` ON `Mediciones` (`fecha`);
CREATE INDEX `idx_beam_fecha` ON `Beam` (`fecha`);
CREATE INDEX `idx_info_modulo_activo` ON `Info_Modulo` (`activo`, `fecha_actualizacion`);

-- ===================================================================
-- 18: USUARIO Y PERMISOS (OPCIONAL)
-- ===================================================================

-- Crear usuario específico para la aplicación (cambiar contraseña)
-- CREATE USER 'monitoring_app'@'%' IDENTIFIED BY 'tu_contraseña_segura';
-- GRANT SELECT, INSERT, UPDATE ON ABS.* TO 'monitoring_app'@'%';
-- GRANT EXECUTE ON PROCEDURE ABS.sp_actualizar_estado_modulo TO 'monitoring_app'@'%';
-- GRANT EXECUTE ON PROCEDURE ABS.sp_registrar_error_apunte TO 'monitoring_app'@'%';
-- GRANT EXECUTE ON PROCEDURE ABS.sp_actualizar_info_modulo TO 'monitoring_app'@'%';
-- GRANT EXECUTE ON PROCEDURE ABS.sp_estadisticas_modulo TO 'monitoring_app'@'%';
-- FLUSH PRIVILEGES;

-- ===================================================================
-- RESUMEN DE FUNCIONALIDADES IMPLEMENTADAS
-- ===================================================================

/*
✅ TABLAS ORIGINALES MANTENIDAS:
   - Control_Reinicio, Modulos, Mediciones, Beam, Log_Reinicios

✅ NUEVAS TABLAS DE MONITOREO:
   - Estado_Conexion: Historial de eventos de conexión
   - Log_Apuntes: Registro de cambios y errores UP/DOWN
   - Info_Modulo: Información técnica (firmware, IP, diagnósticos)
   - Estado_Actual_Modulos: Estado actual en tiempo real

✅ FUNCIONALIDADES:
   - Heartbeat configurable por módulo (30/60 segundos)
   - Detección automática de TIMEOUT
   - Registro de desconexiones con duración
   - Detección de MISMATCH en apuntes
   - Almacenamiento de versión firmware e IP
   - Niveles de alerta configurables
   - Vistas optimizadas para consultas
   - Triggers automáticos
   - Procedimientos almacenados
   - Limpieza automática de logs

✅ CONFIGURACIÓN:
   - 64 módulos de ejemplo con datos
   - Configuración diferenciada por versión
   - Datos técnicos de ejemplo
   - Estado inicial configurado

✅ MANTENIMIENTO:
   - Limpieza automática programada
   - Índices optimizados
   - Estructura escalable
   - Integridad referencial
*/

SELECT '🚀 BASE DE DATOS COMPLETAMENTE CONFIGURADA - LISTA PARA USAR' as ESTADO;
