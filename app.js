//require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const { connectDB } = require("./src/config/database");

app.use(cors());
app.use(express.json());

const usuarioRoutes = require("./src/routes/user.routes");
const proveedorRoutes = require("./src/routes/supplier.routes");
const clienteRoutes = require("./src/routes/customer.routes");
const categoriaRoutes = require("./src/routes/category.routes");
const metodopagoRoutes = require("./src/routes/payment.routes");
const estadoproductoRoutes = require("./src/routes/productStatus.routes");
const purchaseRoutes = require("./src/routes/purchase.routes");
const ventaRoutes = require("./src/routes/sales.routes");
const notificationRoutes = require("./src/routes/notification.routes");

app.use("/usuario", usuarioRoutes);
app.use("/proveedor", proveedorRoutes);
app.use("/cliente", clienteRoutes);
app.use("/categoria", categoriaRoutes);
app.use("/metodopago", metodopagoRoutes);
app.use("/estadoproducto", estadoproductoRoutes);
app.use("/compra", purchaseRoutes);
app.use("/venta", ventaRoutes);
app.use("/notificacion", notificationRoutes);

require('./src/jobs/notification.job.js');

async function startServer() {
    try {
        await connectDB();

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
        });
    } catch (error) {
        console.error("Error al iniciar el servidor:", error);
    }
    }

startServer();
