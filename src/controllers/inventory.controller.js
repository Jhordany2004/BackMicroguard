const inventoryService = require("../services/inventory.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { success } = require("../utils/handleResponse");
const { requireStore, toPositiveInteger } = require("../utils/validators");

const obtenerInventarioProductos = asyncHandler(async (req, res) => {
    const result = await inventoryService.searchInventoryProducts({
        tiendaId: requireStore(req),
        query: req.query
    });

    return success(res, {
        message: result.empty ? "No se encontraron productos" : "Productos encontrados",
        data: {
            productos: result.productos,
            paginacion: result.paginacion
        }
    });
});

const obtenerDetalleProducto = asyncHandler(async (req, res) => {
    const data = await inventoryService.getProductDetail({
        tiendaId: requireStore(req),
        productId: toPositiveInteger(req.params.id, "ID de producto"),
        query: req.query
    });

    return success(res, {
        message: "Producto encontrado",
        data
    });
});

const obtenerEstadosDisponibles = asyncHandler(async (req, res) => {
    const data = await inventoryService.getAvailableStates(requireStore(req));

    return success(res, {
        message: "Estados disponibles",
        data
    });
});

const obtenerEstadoProducto = asyncHandler(async (req, res) => {
    const data = await inventoryService.getProductState({
        tiendaId: requireStore(req),
        productId: toPositiveInteger(req.params.id, "ID de producto")
    });

    return success(res, {
        message: "Estado del producto obtenido correctamente",
        data
    });
});

module.exports = {
    obtenerInventarioProductos,
    obtenerDetalleProducto,
    obtenerEstadoProducto,
    obtenerEstadosDisponibles
};
