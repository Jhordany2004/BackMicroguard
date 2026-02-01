require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const { connectDB } = require("./src/config/database");
const { iniciarCronNotificaciones } = require('./src/jobs/notification.job');

app.use(cors());
app.use(express.json());

const usuarioRoutes = require("./src/routes/user.routes");
const proveedorRoutes = require("./src/routes/supplier.routes");
const clienteRoutes = require("./src/routes/customer.routes");
const categoriaRoutes = require("./src/routes/category.routes");
const metodopagoRoutes = require("./src/routes/payment.routes");
const purchaseRoutes = require("./src/routes/purchase.routes");
const ventaRoutes = require("./src/routes/sales.routes");
const notificationRoutes = require("./src/routes/notification.routes");
const inventarioRoutes = require("./src/routes/inventory.routes");

app.use("/usuario", usuarioRoutes);
app.use("/proveedor", proveedorRoutes);
app.use("/cliente", clienteRoutes);
app.use("/categoria", categoriaRoutes);
app.use("/metodopago", metodopagoRoutes);
app.use("/compra", purchaseRoutes);
app.use("/venta", ventaRoutes);
app.use("/notificacion", notificationRoutes);
app.use("/inventario", inventarioRoutes);

async function startServer() {
    try {
        // Conectar a la base de datos
        await connectDB();

        // Iniciar cron de notificaciones
        iniciarCronNotificaciones();

        // Iniciar servidor
        const PORT = process.env.PORT || 8080;
        const HOST = '0.0.0.0'; // ⬅️ Añadir esto para hosting
        
        app.listen(PORT, HOST, () => { // ⬆️ Añadir HOST aquí
            console.log(`\n====================================`);
            console.log(`   ✅ Servidor corriendo en puerto http://localhost:${PORT}`);
            console.log(`   🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
            console.log(`   🕐 Zona horaria: America/Lima (UTC-5)`);
            console.log(`   🔔 Notificaciones: 6:00 AM diarias`);
            console.log(`====================================\n`);
        });
    } catch (error) {
        console.error("Error al iniciar el servidor:", error);
        process.exit(1);
    }
}

startServer();