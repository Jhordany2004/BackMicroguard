/**
 * Service para gestionar productos y mantener consistencia de datos
 */

const mongoose = require("mongoose");
const LoteProducto = require("../models/batch.model");
const Producto = require("../models/product.model");

const recalcularStockTotalProducto = async (productoId) => {
    try {
        const resultado = await LoteProducto.aggregate([
            {
                $match: {
                    Producto: new mongoose.Types.ObjectId(productoId),
                    estado: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalStock: { $sum: "$stockActual" }
                }
            }
        ]);

        const stockTotal = resultado[0]?.totalStock || 0;

        await Producto.findByIdAndUpdate(
            productoId,
            { stockTotal },
            { new: true }
        );

        return stockTotal;
    } catch (error) {
        console.error(`Error al recalcular stock del producto ${productoId}:`, error);
        throw error;
    }
};

const obtenerStockRealProducto = async (productoId) => {
    try {
        const resultado = await LoteProducto.aggregate([
            {
                $match: {
                    Producto: new mongoose.Types.ObjectId(productoId),
                    estado: true
                }
            },
            {
                $group: {
                    _id: null,
                    totalStock: { $sum: "$stockActual" }
                }
            }
        ]);

        return resultado[0]?.totalStock || 0;
    } catch (error) {
        console.error(`Error al obtener stock real del producto ${productoId}:`, error);
        throw error;
    }
};

const sincronizarStockTienda = async (tiendaId) => {
    try {
        const productos = await Producto.find({ Tienda: tiendaId });

        let productosActualizados = 0;
        let discrepancias = 0;

        for (const producto of productos) {
            const stockReal = await obtenerStockRealProducto(producto._id);

            if (producto.stockTotal !== stockReal) {
                discrepancias++;
                await Producto.findByIdAndUpdate(
                    producto._id,
                    { stockTotal: stockReal }
                );
                productosActualizados++;
            }
        }

        return {
            totalProductos: productos.length,
            productosActualizados,
            discrepancias,
            timestamp: new Date()
        };
    } catch (error) {
        console.error(`Error al sincronizar stock de tienda ${tiendaId}:`, error);
        throw error;
    }
};

module.exports = {
    recalcularStockTotalProducto,
    obtenerStockRealProducto,
    sincronizarStockTienda
};
