DROP DATABASE IF EXISTS ProgramaDatos;

CREATE DATABASE ProgramaDatos;

USE ProgramaDatos;

DROP TABLE IF EXISTS Clientes;

CREATE TABLE Clientes (
    CodigoCliente INT PRIMARY KEY,
    NombreCliente VARCHAR(255)
);

INSERT INTO Clientes (CodigoCliente, NombreCliente) VALUES
(1, 'Juan Perez'),
(2, 'Maria Gomez'),
(3, 'Carlos Sanchez');

DROP TABLE IF EXISTS Asesores;

CREATE TABLE Asesores (
    CodigoAsesor INT PRIMARY KEY,
    NombreAsesor VARCHAR(255)
);

INSERT INTO Asesores (CodigoAsesor, NombreAsesor) VALUES
(1, 'Ana Lopez'),
(2, 'Luis Martinez'),
(3, 'Sofia Rodriguez');

DROP TABLE IF EXISTS FormasPago;

CREATE TABLE FormasPago (
    FormaPagoID INT PRIMARY KEY,
    DescripcionFormaPago VARCHAR(255)
);

INSERT INTO FormasPago (FormaPagoID, DescripcionFormaPago) VALUES
(1, 'Efectivo'),
(2, 'Tarjeta de Crédito'),
(3, 'Transferencia Bancaria');

DROP TABLE IF EXISTS Productos;

CREATE TABLE Productos (
    CodigoProducto INT PRIMARY KEY,
    NombreProducto VARCHAR(255),
    Precio DECIMAL(10, 2)
);

INSERT INTO Productos (CodigoProducto, NombreProducto, Precio) VALUES
(1, 'Producto A', 10.00),
(2, 'Producto B', 20.00),
(3, 'Producto C', 30.00);

DROP TABLE IF EXISTS Ventas;

CREATE TABLE Ventas (
    VentaID INT PRIMARY KEY AUTO_INCREMENT,
    CodigoCliente INT,
    CodigoAsesor INT,
    FormaPagoID INT,
    CodigoProducto INT,
    Cantidad INT,
    Precio DECIMAL(10, 2),
    FOREIGN KEY (CodigoCliente) REFERENCES Clientes(CodigoCliente),
    FOREIGN KEY (CodigoAsesor) REFERENCES Asesores(CodigoAsesor),
    FOREIGN KEY (FormaPagoID) REFERENCES FormasPago(FormaPagoID),
    FOREIGN KEY (CodigoProducto) REFERENCES Productos(CodigoProducto)
);
