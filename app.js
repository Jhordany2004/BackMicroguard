require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const { connectDB } = require("./src/config/database");

app.use(cors());
app.use(express.json());

const usuarioRoutes = require("./src/routes/user.routes");
const categoriaRoutes = require("./src/routes/category.routes");
const proveedorRoutes = require("./src/routes/supplier.routes");
const clienteRoutes = require("./src/routes/customer.routes");
const serviceRoutes = require("./src/routes/service.routes");

app.use("/servicio", serviceRoutes);
app.use("/usuario", usuarioRoutes);
app.use("/categoria", categoriaRoutes);
app.use("/proveedor", proveedorRoutes);
app.use("/cliente", clienteRoutes);

// Rutas pendientes de migrar a PostgreSQL:
// metodopago, compra, venta, notificacion, inventario y producto.

async function startServer() {
    try {

        await connectDB();

        const PORT = process.env.PORT || 8080;
        const HOST = '0.0.0.0'; 
        
        app.listen(PORT, HOST, () => { 
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
