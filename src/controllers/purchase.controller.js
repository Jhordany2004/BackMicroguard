const Compra = require("../models/purchase.model");
const Proveedor = require("../models/supplier.model");
const Producto = require("../models/product.model");
const LoteProducto = require("../models/batch.model");
const Tienda = require("../models/store.model");
const crypto = require('crypto'); // Para generar código único


const registrarCompra = async (req, res) => {
    try {
        const { proveedor, detalles } = req.body;
        const usuario = req.usuarioId;

        if (!proveedor || !detalles || !Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({ message: "Proveedor y detalles son requeridos" });
        }

        const tienda = await Tienda.findOne({ Usuario: usuario });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }

        let precioTotal = 0;
        let lotesCompra = [];

        for (const [i, detalle] of detalles.entries()) {
            let {
                NombreProducto,
                CodigoBarras,                
                CantidadMedida,
                Medida,
                Perecible,
                IdCategoria,
                CantidadComprada,
                PrecioCompraUnidad,
                PrecioVentaUnidad,
                FechaIngreso,
                FechaVencimiento
            } = detalle;

            if (!CodigoBarras || CodigoBarras.trim() === "") {
                CodigoBarras = crypto.randomBytes(8).toString('hex');
            }            
            if (!Perecible) {
                FechaVencimiento = "";
            }

            // Buscar producto por código de barras y nombre en la tienda
            let producto;
            try {
                producto = await Producto.findOne({
                    Tienda: tienda._id,
                    $or: [
                        { codigoBarras: CodigoBarras },
                        { nombre: NombreProducto }
                    ]
                });
            } catch (error) {
                return res.status(500).json({ message: `Error al buscar producto en el detalle #${i + 1}: ${error.message}` });
            }

            // Si no existe, crear el producto
            if (!producto) {
                try {
                    producto = new Producto({
                        nombre: NombreProducto,
                        codigoBarras: CodigoBarras,
                        imagen: "",
                        cantidadmedida: CantidadMedida,
                        stockTotal: CantidadComprada,
                        medida: Medida,
                        perecible: Perecible,
                        Tienda: tienda._id,
                        Categoria: IdCategoria
                    });
                    await producto.save();
                } catch (error) {
                    return res.status(500).json({ message: `Error al crear producto en el detalle #${i + 1}: ${error.message}` });
                }
            }

            // Crear lote para el producto
            let nuevoLote;
            try {
                nuevoLote = new LoteProducto({
                    stockInicial: CantidadComprada,
                    stockActual: CantidadComprada,
                    precioCompra: PrecioCompraUnidad,
                    precioVenta: PrecioVentaUnidad,
                    fechaIngreso: FechaIngreso,
                    fechaVencimiento: FechaVencimiento,
                    Producto: producto._id,
                    EstadoProducto: "68df19298196e9348a65c876",
                });
                await nuevoLote.save();
            } catch (error) {
                return res.status(500).json({ message: `Error al crear lote en el detalle #${i + 1}: ${error.message}` });
            }

            // Actualizar stock del producto
            try {
                await Producto.findByIdAndUpdate(
                    producto._id,
                    { $inc: { stockTotal: CantidadComprada } }
                );
            } catch (error) {
                return res.status(500).json({ message: `Error al actualizar stock en el detalle #${i + 1}: ${error.message}` });
            }

            // Agregar lote a la compra
            lotesCompra.push(nuevoLote._id);

            precioTotal += CantidadComprada * PrecioCompraUnidad;
        }

        // Crear la compra con array de lotes
        let nuevaCompra;
        try {
            nuevaCompra = new Compra({
                Tienda: tienda._id,
                Proveedor: proveedor,
                precioTotal,
                Lotes: lotesCompra
            });
            await nuevaCompra.save();
        } catch (error) {
            return res.status(500).json({ message: `Error al registrar la compra: ${error.message}` });
        }

        res.status(201).json({ message: "Compra registrada correctamente", compra: nuevaCompra });
    } catch (error) {
        res.status(500).json({ message: `Error inesperado al registrar compra: ${error.message}` });
    }
};

module.exports = {
    registrarCompra
};
