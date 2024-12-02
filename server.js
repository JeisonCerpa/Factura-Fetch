const express = require("express");
const mysql = require("mysql");
const bodyParser = require("body-parser");
const puppeteer = require("puppeteer");
const fs = require("fs");
const path = require("path");

const app = express();

// Configurar middleware
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.set("view engine", "ejs");
app.use(express.static("public"));

// Conexión a la base de datos
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "ProgramaDatos",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Conexión a la base de datos exitosa.");
});

// Rutas
app.get("/", (req, res) => {
  db.query("SELECT CodigoCliente, NombreCliente FROM Clientes", (err, clientes) => {
    if (err) throw err;
    db.query("SELECT CodigoAsesor, NombreAsesor FROM Asesores", (err, asesores) => {
      if (err) throw err;
      db.query("SELECT CodigoProducto, NombreProducto FROM Productos", (err, productos) => {
        if (err) throw err;
        res.render("index", { clientes, asesores, productos }); // Pasar la lista de clientes, asesores y productos a la vista
      });
    });
  });
});

app.get("/precioProducto", (req, res) => {
  const { codigo } = req.query;
  db.query("SELECT Precio FROM Productos WHERE CodigoProducto = ?", [codigo], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err });
    if (result.length === 0) return res.status(404).json({ success: false, error: "Producto no encontrado" });
    res.json({ precio: result[0].Precio });
  });
});

app.get("/nombreCliente", (req, res) => {
  const { codigo } = req.query;
  db.query("SELECT NombreCliente FROM Clientes WHERE CodigoCliente = ?", [codigo], (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err });
    if (result.length === 0) return res.status(404).json({ success: false, error: "Cliente no encontrado" });
    res.json({ nombre: result[0].NombreCliente });
  });
});

app.get("/clientes", (req, res) => {
  db.query("SELECT CodigoCliente, NombreCliente FROM Clientes", (err, result) => {
    if (err) return res.status(500).json({ success: false, error: err });
    res.json({ cliente: result });
  });
});

// Guardar factura
app.post("/facturar", (req, res) => {
  const { cliente, asesor, formaPago, productos } = req.body;

  // Generar un número de factura único
  const numeroFactura = `F-${Date.now()}`;

  // Calcular el total de la factura
  const total = productos.reduce((sum, prod) => sum + prod.cantidad * prod.precio, 0);

  // Obtener datos del cliente, asesor y forma de pago
  db.query(
    "SELECT NombreCliente FROM Clientes WHERE CodigoCliente = ?",
    [cliente],
    (err, clienteResult) => {
      if (err) return res.status(500).json({ success: false, error: err });

      db.query(
        "SELECT NombreAsesor FROM Asesores WHERE CodigoAsesor = ?",
        [asesor],
        (err, asesorResult) => {
          if (err) return res.status(500).json({ success: false, error: err });

          db.query(
            "SELECT DescripcionFormaPago FROM FormasPago WHERE FormaPagoID = ?",
            [formaPago],
            (err, formaPagoResult) => {
              if (err) return res.status(500).json({ success: false, error: err });

              const nombreCliente = clienteResult[0].NombreCliente;
              const nombreAsesor = asesorResult[0].NombreAsesor;
              const nombreFormaPago = formaPagoResult[0].DescripcionFormaPago;

              // Obtener nombres de los productos
              const productosConNombre = [];
              let productosProcesados = 0;

              productos.forEach((producto, index) => {
                db.query(
                  "SELECT NombreProducto FROM Productos WHERE CodigoProducto = ?",
                  [producto.codigo],
                  (err, productoResult) => {
                    if (err) return res.status(500).json({ success: false, error: err });

                    productosConNombre[index] = {
                      ...producto,
                      nombre: productoResult[0].NombreProducto
                    };

                    productosProcesados++;
                    if (productosProcesados === productos.length) {
                      // Insertar factura en la base de datos
                      db.query(
                        "INSERT INTO Ventas (CodigoCliente, CodigoAsesor, FormaPagoID, CodigoProducto, Cantidad, Precio) VALUES ?",
                        [productos.map(p => [cliente, asesor, formaPago, p.codigo, p.cantidad, p.precio])],
                        async (err) => {
                          if (err) return res.status(500).json({ success: false, error: err });

                          // Generar PDF con Puppeteer
                          const browser = await puppeteer.launch();
                          const page = await browser.newPage();
                          const productosHTML = productosConNombre.map(p => `
                            <tr>
                              <td>${p.codigo}</td>
                              <td>${p.nombre}</td>
                              <td>${p.cantidad}</td>
                              <td>${p.precio.toFixed(2)}</td>
                              <td>${(p.cantidad * p.precio).toFixed(2)}</td>
                            </tr>
                          `).join("");
                          await page.setContent(`
                            <html>
                              <body>
                                <h1>Factura</h1>
                                <p><strong>Código Cliente:</strong> ${cliente}</p>
                                <p><strong>Nombre Cliente:</strong> ${nombreCliente}</p>
                                <p><strong>Código Asesor:</strong> ${asesor}</p>
                                <p><strong>Nombre Asesor:</strong> ${nombreAsesor}</p>
                                <p><strong>Forma de Pago:</strong> ${nombreFormaPago}</p>
                                <table border="1" cellspacing="0" cellpadding="5">
                                  <thead>
                                    <tr>
                                      <th>Código Producto</th>
                                      <th>Nombre Producto</th>
                                      <th>Cantidad</th>
                                      <th>Precio Unitario</th>
                                      <th>Precio Total</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    ${productosHTML}
                                  </tbody>
                                  <tfoot>
                                    <tr>
                                      <td colspan="4"><strong>Total</strong></td>
                                      <td><strong>${total.toFixed(2)}</strong></td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </body>
                            </html>
                          `);
                          const pdfPath = path.join(__dirname, "public", `factura_${numeroFactura}.pdf`);
                          await page.pdf({ path: pdfPath, format: 'A4' });
                          await browser.close();

                          res.json({ success: true, numeroFactura, pdfPath: `/factura_${numeroFactura}.pdf` });
                        }
                      );
                    }
                  }
                );
              });
            }
          );
        }
      );
    }
  );
});

// Iniciar el servidor
app.listen(3000, () => {
  console.log("Servidor iniciado en http://localhost:3000");
});