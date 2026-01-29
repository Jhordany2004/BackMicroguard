/**
 * Service para gestionar productos y mantener consistencia de datos
 */

const LoteProducto = require("../models/batch.model");
const Producto = require("../models/product.model");

/**
 * Recalcula el stockTotal de un producto basado en la suma de stockActual de todos sus lotes
 * Esto asegura que el campo stockTotal siempre esté sincronizado con la realidad
 * 
 * @param {ObjectId} productoId - ID del producto
 * @returns {Promise<number>} - stockTotal actualizado
 */
const recalcularStockTotalProducto = async (productoId) => {
    try {
        // Usar aggregation para obtener la suma exacta
        const resultado = await LoteProducto.aggregate([
            { 
                $match: { 
                    Producto: require('mongoose').Types.ObjectId(productoId),
                    estado: true // Solo lotes activos
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

        // Actualizar el producto con el nuevo stockTotal
        await Producto.findByIdAndUpdate(
            productoId,
            { stockTotal: stockTotal },
            { new: true }
        );

        return stockTotal;
    } catch (error) {
        console.error(`Error al recalcular stock del producto ${productoId}:`, error);
        throw error;
    }
};

/**
 * Obtiene el stockTotal real de un producto (sin usar el campo almacenado)
 * Útil para validaciones críticas
 * 
 * @param {ObjectId} productoId - ID del producto
 * @returns {Promise<number>} - Stock actual real
 */
const obtenerStockRealProducto = async (productoId) => {
    try {
        const resultado = await LoteProducto.aggregate([
            { 
                $match: { 
                    Producto: require('mongoose').Types.ObjectId(productoId),
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

/**
 * Sincroniza el stockTotal de todos los productos de una tienda
 * Útil para ejecutar periódicamente como mantenimiento
 * 
 * @param {ObjectId} tiendaId - ID de la tienda
 * @returns {Promise<Object>} - Estadísticas de sincronización
 */
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
