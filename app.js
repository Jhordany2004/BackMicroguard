//require("dotenv").config();

const express = require("express");
const cors = require("cors");

const app = express();

const { connectDB } = require("./src/config/database");

app.use(cors());
app.use(express.json());

const usuarioRoutes = require("./src/routes/user.routes");
//const compraRoutes = require("./src/routes/purchase.routes");
//const ventaRoutes = require("./src/routes/sale.routes");
//const tipoProductoRoutes = require("./src/routes/productType.routes");
//const productoRoutes = require("./src/routes/inventory.routes");

app.use("/usuario", usuarioRoutes);
//app.use("/compra", compraRoutes);
//app.use("/venta", ventaRoutes);
//app.use("/tipoProducto", tipoProductoRoutes);
//app.use("/producto", productoRoutes);

async function startServer() {
    try {
        await connectDB();

        app.listen(5000, () => {
        console.log(
            `> Servidor local (Para desarrollo): http://localhost:${5000}`
        );
        });
    } catch (error) {
        console.error("Error al iniciar el servidor:", error);
    }
    }

startServer();
