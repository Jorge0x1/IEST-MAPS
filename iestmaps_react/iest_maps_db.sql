-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 30-04-2026 a las 07:52:18
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `iest_maps`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `banos`
--

CREATE TABLE `banos` (
  `edificio` int(5) NOT NULL,
  `piso` int(5) NOT NULL,
  `id` varchar(50) NOT NULL,
  `tipo` varchar(50) NOT NULL,
  `x` int(5) NOT NULL,
  `y` int(5) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `banos`
--

INSERT INTO `banos` (`edificio`, `piso`, `id`, `tipo`, `x`, `y`) VALUES
(5, 1, 'baño_5', 'baño', 240, 1440),
(5, 2, 'baño_5arriba', 'baño', 240, 1435),
(1, 2, 'baño_h1arriba', 'baño_h', 1200, 560),
(2, 2, 'baño_h2arriba', 'baño_h', 285, 820),
(3, 2, 'baño_h3arriba', 'baño_h', 1185, 1074),
(5, 1, 'baño_h5', 'baño_h', 240, 1315),
(6, 1, 'baño_m1', 'baño_m', 1920, 300),
(2, 1, 'baño_m2', 'baño_m', 285, 820),
(2, 1, 'baño_m2arriba', 'baño_m', 1200, 850),
(3, 2, 'baño_m3arriba', 'baño_m', 1185, 1097),
(5, 1, 'baño_m5', 'baño_m', 240, 1235);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `oficina`
--

CREATE TABLE `oficina` (
  `edificio` int(11) DEFAULT NULL,
  `piso` int(11) DEFAULT NULL,
  `lugar` varchar(255) DEFAULT NULL,
  `ID_oficina` int(255) NOT NULL,
  `x` int(11) DEFAULT NULL,
  `y` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `oficina`
--

INSERT INTO `oficina` (`edificio`, `piso`, `lugar`, `ID_oficina`, `x`, `y`) VALUES
(1, 2, 'Sala de juicios orales', 106, 1100, 540),
(4, 2, 'Electronica Digital', 406, 885, 1290),
(4, 2, 'Electronica Analogica', 407, 840, 1290),
(1, 1, 'Ciencias Exactas', 40001, 1020, 540),
(1, 1, 'Prefectura', 40002, 850, 540),
(2, 1, 'Ciencias Exactas II', 40003, 960, 820),
(2, 1, 'Consultorio Medico', 40004, 1070, 820),
(4, 1, 'Academica', 40009, 450, 1290),
(4, 1, 'Division de Preparatoria', 40010, 590, 1290),
(3, 1, 'Pastoral', 40011, 1050, 1060),
(6, 2, 'Admisiones', 50001, 1090, 300),
(6, 2, 'Capital Humano', 50002, 1470, 300),
(6, 2, 'Compromiso Social', 50003, 1740, 300),
(5, 2, 'CAADI', 50006, 240, 1160),
(5, 2, 'Humanidades', 50007, 240, 730),
(5, 2, 'Desarrollo Academico', 50008, 240, 455),
(5, 2, 'Direccion de Preparatoria', 50009, 240, 1240),
(6, 1, 'Servicios Escolares', 60001, 1100, 260),
(6, 1, 'DTI', 60002, 1800, 300),
(0, 1, 'Capilla', 90000, 75, 230),
(3, 1, 'Biblioteca', 90001, 1685, 1170),
(0, 1, 'Cafe', 90002, 1305, 1420),
(0, 1, 'Snacks', 90003, 1380, 1180),
(0, 1, 'Sorbitos', 90004, 1150, 1405),
(4, 1, 'Subway', 90005, 1090, 1290),
(1, 1, 'Entrada Principal', 100001, 1225, 30);

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `registro_visitante`
--

CREATE TABLE `registro_visitante` (
  `id` int(11) NOT NULL,
  `nombre` varchar(100) NOT NULL,
  `usuario_visitante` varchar(50) NOT NULL,
  `contrasena` varchar(50) NOT NULL,
  `motivo` varchar(255) NOT NULL,
  `destino` varchar(255) NOT NULL,
  `telefono` varchar(20) NOT NULL,
  `hora_entrada` datetime DEFAULT current_timestamp(),
  `hora_salida` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `registro_visitante`
--

INSERT INTO `registro_visitante` (`id`, `nombre`, `usuario_visitante`, `contrasena`, `motivo`, `destino`, `telefono`, `hora_entrada`, `hora_salida`) VALUES
(6, 'Lizeth Mascareñas Torres', 'LizethMT', 'LizMaT0', 'Imprimir Kardex', 'Becas', '8333393545', '2025-05-18 21:40:00', '2025-05-19 21:43:23'),
(7, 'Carlos Rene', 'Carlos01', 'CarlosR3', 'Informes de Carrera', 'Becas', '833123456789', '2025-05-18 21:50:00', '2025-05-19 21:55:00'),
(16, 'Amelia Torres', 'AmeTo', 'Am3T0', 'Informes', 'Becas', '08080808', '2025-05-19 22:09:35', '2025-05-19 22:18:02'),
(17, 'Carlos Arturo', 'CarlosArturo', 'cec', 'Alexandro', 'Ciencias exactas', '232323', '2025-05-20 18:47:31', '2025-05-20 18:48:06'),
(18, 'Victor', 'Victor01', 'vic', 'Entraga de Calificaciones', '5', '12255689', '2025-05-20 19:20:07', '2025-05-20 19:21:13'),
(60, 'Rodo', 'ramcasrodolfo', '123', 'Cristian', 'Ciencias Exactas', '8331', '2025-05-22 17:13:19', '2025-05-22 17:17:34'),
(61, 'Carlos Arturo', 'CarlosA', '123', 'Hablar con Profe Jose Luis ', 'Ciencias Exactas', '111111', '2025-05-24 13:37:48', '2025-05-24 13:38:33'),
(63, 'rodolfo', 'rodolforamcas', 'rodolforamcas', 'Imprimir Kardex', '501', '08080808', '2026-02-03 16:41:40', '2026-02-03 16:43:28'),
(64, 'jorge del angel', 'jorge.angel.64', 'Visitante760552', 'akrdex', 'pastoral', '123456', '2026-03-24 00:59:18', '2026-03-24 00:59:44'),
(65, 'jorge mascareeñas', 'jorge.mascareenas.65', 'Visitante644412', 'kardex', '506', '456123', '2026-03-24 01:31:37', '2026-03-24 01:32:40'),
(67, 'carlitos san', 'carlitos.san.67', 'Visitante213977', 'kardex', 'pastoral', '123456', '2026-03-24 15:18:34', '2026-03-24 15:21:54'),
(68, 'Santiago', 'santiago.usuario.68', 'Visitante570087', 'Visita', '101', '8333333333', '2026-03-24 17:02:17', '2026-03-24 17:07:11'),
(69, 'yo', 'yo.usuario.69', 'Visitante416316', 'kardex', 'pastoral', '123456', '2026-03-26 18:02:58', '2026-03-26 18:03:50'),
(70, 'alexandro', 'alexandro.usuario.70', 'Visitante803338', 'kardex', 'pastoral', '159159', '2026-04-24 15:38:41', '2026-04-24 15:42:30');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `salones`
--

CREATE TABLE `salones` (
  `edificio` int(11) DEFAULT NULL,
  `piso` int(11) DEFAULT NULL,
  `numero_salon` int(255) NOT NULL,
  `x` int(11) DEFAULT NULL,
  `y` int(11) DEFAULT NULL,
  `uso` varchar(50) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `salones`
--

INSERT INTO `salones` (`edificio`, `piso`, `numero_salon`, `x`, `y`, `uso`) VALUES
(1, 1, 101, 760, 540, 'Salon'),
(1, 1, 102, 675, 540, 'Salon'),
(1, 1, 103, 585, 540, 'Salon'),
(1, 1, 104, 510, 540, 'Salon'),
(1, 1, 105, 415, 540, 'Salon'),
(1, 2, 107, 985, 540, 'Salon'),
(1, 2, 108, 870, 540, 'Salon'),
(1, 2, 109, 760, 540, 'Salon'),
(1, 2, 110, 640, 540, 'Salon'),
(1, 2, 111, 530, 540, 'Salon'),
(1, 2, 116, 405, 540, 'Salon'),
(2, 1, 203, 845, 820, 'Salon'),
(2, 1, 204, 755, 820, 'Salon'),
(2, 1, 205, 670, 820, 'Salon'),
(2, 1, 206, 590, 820, 'Salon'),
(2, 1, 207, 540, 820, 'Salon'),
(2, 1, 208, 489, 820, 'Salon'),
(2, 1, 209, 400, 820, 'Salon'),
(2, 2, 210, 1105, 820, 'Salon'),
(2, 2, 211, 1025, 820, 'Salon'),
(2, 2, 212, 944, 820, 'Salon'),
(2, 2, 213, 850, 820, 'Salon'),
(2, 2, 214, 760, 820, 'Salon'),
(2, 2, 215, 680, 820, 'Salon'),
(2, 2, 216, 595, 820, 'Salon'),
(2, 2, 217, 535, 820, 'Salon'),
(2, 2, 218, 480, 820, 'Salon'),
(2, 2, 219, 400, 820, 'Salon'),
(3, 1, 301, 910, 1060, 'Salon'),
(3, 1, 303, 810, 1060, 'Salon'),
(3, 1, 304, 670, 1060, 'Salon'),
(3, 1, 305, 605, 1060, 'Salon'),
(3, 2, 306, 1100, 1060, 'Salon'),
(3, 2, 307, 1000, 1060, 'Salon'),
(3, 2, 308, 890, 1060, 'Salon'),
(3, 2, 309, 790, 1060, 'Salon'),
(3, 2, 310, 685, 1060, 'Salon'),
(3, 2, 311, 605, 1060, 'Salon'),
(4, 1, 401, 940, 1290, 'Salon'),
(4, 1, 402, 840, 1290, 'Salon'),
(4, 1, 403, 720, 1290, 'Salon'),
(4, 2, 408, 695, 1290, 'Salon'),
(4, 2, 409, 620, 1290, 'Salon'),
(4, 2, 410, 465, 1290, 'Salon'),
(4, 2, 411, 380, 1290, 'Salon'),
(5, 1, 501, 240, 475, 'Salon'),
(5, 1, 502, 240, 615, 'Salon'),
(5, 1, 503, 240, 730, 'Salon'),
(5, 1, 504, 240, 865, 'Salon'),
(5, 1, 505, 240, 1130, 'Salon'),
(5, 1, 506, 240, 1395, 'Salon'),
(5, 2, 512, 240, 730, 'Salon'),
(5, 2, 516, 240, 1365, 'Salon'),
(6, 1, 602, 1590, 300, 'Salon'),
(6, 1, 603, 1500, 300, 'Salon'),
(6, 1, 604, 1420, 300, 'Salon'),
(6, 1, 605, 1315, 260, 'Salon'),
(3, 1, 901, 300, 1095, 'Gastronomia');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `usuarios`
--

CREATE TABLE `usuarios` (
  `nombre` varchar(50) DEFAULT NULL,
  `usuario` varchar(50) DEFAULT NULL,
  `ID_IEST` int(11) NOT NULL,
  `contrasena` varchar(50) DEFAULT NULL,
  `rol` varchar(20) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Volcado de datos para la tabla `usuarios`
--

INSERT INTO `usuarios` (`nombre`, `usuario`, `ID_IEST`, `contrasena`, `rol`) VALUES
('Guardia Anahuac', 'Guardianahuac', 1, 'Guard3lf1n', 'Guardia'),
('Genoveva Espuna', 'SuperAdmin', 2, 'D3lf1n@', 'Administrador'),
('jorge.delangel01', 'jorge.delangel01@iest.edu.mx', 3, '', 'Alumno'),
('pruebaadmin', 'pruebaadmin', 10, 'pruebaadmin', 'Administrador'),
('Rodolfo Ramírez Castillo', 'rodelfin.ramcas', 1111, '1234', 'Alumno'),
('Jorge Del Angel Mascareñas', 'jorge.delangel01', 22038, 'nflu95285', 'Alumno'),
('pruebaguardia', 'pruebaguardia', 22039, 'pruebaguardia', 'Guardia'),
('prueba', 'prueba', 22040, 'prueba', 'Alumno');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `banos`
--
ALTER TABLE `banos`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `oficina`
--
ALTER TABLE `oficina`
  ADD PRIMARY KEY (`ID_oficina`);

--
-- Indices de la tabla `registro_visitante`
--
ALTER TABLE `registro_visitante`
  ADD PRIMARY KEY (`id`);

--
-- Indices de la tabla `salones`
--
ALTER TABLE `salones`
  ADD PRIMARY KEY (`numero_salon`);

--
-- Indices de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  ADD PRIMARY KEY (`ID_IEST`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `registro_visitante`
--
ALTER TABLE `registro_visitante`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=71;

--
-- AUTO_INCREMENT de la tabla `usuarios`
--
ALTER TABLE `usuarios`
  MODIFY `ID_IEST` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22041;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
