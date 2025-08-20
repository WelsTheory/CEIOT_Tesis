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


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `DAM`
--
CREATE DATABASE IF NOT EXISTS `DAM` DEFAULT CHARACTER SET latin1 COLLATE latin1_swedish_ci;
USE `DAM`;

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
  `resetId` int(11) NOT NULL,
  CONSTRAINT `chk_up_values` CHECK (`up` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5)),
  CONSTRAINT `chk_down_values` CHECK (`down` IN (0.0, 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5))
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Volcado de datos para la tabla `Modulos`
--

INSERT INTO `Modulos` (`moduloId`, `nombre`, `ubicacion`, `version`, `up`, `down`, `resetId`) VALUES
(1, 'Modulo 1', 'Norte', '1.0', 1.0, 0.5, 1),
(2, 'Modulo 2', 'Sur', '1.0', 2.5, 1.0, 2),
(3, 'Modulo 3', 'Este', '2.0', 3.5, 0.0, 3),
(4, 'Modulo 4', 'Oeste', '1.0', 0.5, 2.0, 4),
(5, 'Modulo 5', 'Norte', '2.0', 1.5, 0.5, 5),
(6, 'Modulo 6', 'Sur', '1.0', 3.0, 1.5, 6),
(7, 'Modulo 7', 'Este', '2.0', 2.0, 0.0, 7),
(8, 'Modulo 8', 'Oeste', '1.0', 0.0, 3.5, 8),
(9, 'Modulo 9', 'Norte', '2.0', 2.5, 1.0, 9);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Control_Reinicio`
--

CREATE TABLE `Control_Reinicio` (
  `resetId` int(11) NOT NULL,
  `nombre` varchar(45) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

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
-- Estructura de tabla para la tabla `Log_Riegos`
--

CREATE TABLE `Log_Riegos` (
  `logRiegoId` int(11) NOT NULL,
  `apertura` tinyint(4) DEFAULT NULL,
  `fecha` datetime DEFAULT NULL,
  `resetId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `Mediciones`
--

CREATE TABLE `Mediciones` (
  `medicionId` int(11) NOT NULL,
  `fecha` datetime DEFAULT NULL,
  `valor` varchar(100) DEFAULT NULL,
  `moduloId` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

--
-- Volcado de datos para la tabla `Mediciones`
--

INSERT INTO `Mediciones` (`medicionId`, `fecha`, `valor`, `moduloId`) VALUES
(1, '2020-11-26 21:19:41', '60', 1),
(2, '2020-11-26 21:19:41', '40', 1),
(3, '2020-11-26 21:19:41', '30', 2),
(4, '2020-11-26 21:19:41', '50', 3),
(5, '2020-11-26 21:19:41', '33', 5),
(6, '2020-11-26 21:19:41', '17', 4),
(7, '2020-11-26 21:19:41', '29', 6),
(8, '2020-11-26 21:19:41', '20', 1),
(9, '2020-11-26 21:19:41', '44', 4),
(10, '2020-11-26 21:19:41', '61', 5),
(11, '2020-11-26 21:19:41', '28', 7),
(12, '2020-11-26 21:19:41', '12', 2),
(13, '2020-11-26 21:19:41', '23', 9),
(14, '2020-11-26 21:19:41', '11', 8);

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `Modulos`
--
ALTER TABLE `Modulos`
  ADD PRIMARY KEY (`moduloId`,`resetId`),
  ADD KEY `fk_Modulos_Control_Reinicio1_idx` (`resetId`);

--
-- Indices de la tabla `Control_Reinicio`
--
ALTER TABLE `Control_Reinicio`
  ADD PRIMARY KEY (`resetId`);

--
-- Indices de la tabla `Log_Riegos`
--
ALTER TABLE `Log_Riegos`
  ADD PRIMARY KEY (`logRiegoId`,`resetId`),
  ADD KEY `fk_Log_Riegos_Control_Reinicio1_idx` (`resetId`);

--
-- Indices de la tabla `Mediciones`
--
ALTER TABLE `Mediciones`
  ADD PRIMARY KEY (`medicionId`,`moduloId`),
  ADD KEY `fk_Mediciones_Modulos_idx` (`moduloId`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `Modulos`
--
ALTER TABLE `Modulos`
  MODIFY `moduloId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `Control_Reinicio`
--
ALTER TABLE `Control_Reinicio`
  MODIFY `resetId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT de la tabla `Log_Riegos`
--
ALTER TABLE `Log_Riegos`
  MODIFY `logRiegoId` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `Mediciones`
--
ALTER TABLE `Mediciones`
  MODIFY `medicionId` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `Modulos`
--
ALTER TABLE `Modulos`
  ADD CONSTRAINT `fk_Modulos_Control_Reinicio1` FOREIGN KEY (`resetId`) REFERENCES `Control_Reinicio` (`resetId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Filtros para la tabla `Log_Riegos`
--
ALTER TABLE `Log_Riegos`
  ADD CONSTRAINT `fk_Log_Riegos_Control_Reinicio1` FOREIGN KEY (`resetId`) REFERENCES `Control_Reinicio` (`resetId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

--
-- Filtros para la tabla `Mediciones`
--
ALTER TABLE `Mediciones`
  ADD CONSTRAINT `fk_Mediciones_Modulos` FOREIGN KEY (`moduloId`) REFERENCES `Modulos` (`moduloId`) ON DELETE NO ACTION ON UPDATE NO ACTION;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;