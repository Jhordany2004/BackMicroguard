const productService = require("../services/product.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { created, success } = require("../utils/handleResponse");
const { requireStore, toBoolean, toPositiveInteger } = require("../utils/validators");

const registrarProducto = asyncHandler(async (req, res) => {
    const data = await productService.createProduct({
        tiendaId: requireStore(req),
        body: req.body
    });

    return created(res, {
        message: "Producto registrado correctamente",
        data
    });
});

const listarProductos = asyncHandler(async (req, res) => {
    const result = await productService.listProducts(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay productos registrados" : "Productos obtenidos correctamente",
        data: { productos: result.productos }
    });
});

const listarProductosActivos = asyncHandler(async (req, res) => {
    const result = await productService.listActiveProducts(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay productos activos" : "Productos activos obtenidos correctamente",
        data: { productos: result.productos }
    });
});

const buscarProductoPorId = asyncHandler(async (req, res) => {
    const data = await productService.getProduct({
        id: toPositiveInteger(req.params.id, "ID de producto"),
        tiendaId: requireStore(req)
    });

    return success(res, {
        message: "Producto obtenido correctamente",
        data
    });
});

const obtenerSugerencias = asyncHandler(async (req, res) => {
    const result = await productService.getSuggestions({
        tiendaId: requireStore(req),
        query: req.query
    });

    return success(res, {
        message: result.empty ? "No hay productos sugeridos" : "Productos sugeridos",
        data: { productos: result.productos }
    });
});

const buscarProductos = asyncHandler(async (req, res) => {
    const result = await productService.searchProducts({
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

const obtenerProductoPorCodigo = asyncHandler(async (req, res) => {
    const data = await productService.getProductByCode({
        tiendaId: requireStore(req),
        code: req.params.codigo || req.query.codigo
    });

    return success(res, {
        message: "Producto encontrado",
        data
    });
});

const editarProducto = asyncHandler(async (req, res) => {
    const data = await productService.updateProduct({
        id: toPositiveInteger(req.params.id, "ID de producto"),
        tiendaId: requireStore(req),
        body: req.body
    });

    return success(res, {
        message: "Producto actualizado correctamente",
        data
    });
});

const cambiarEstadoProducto = asyncHandler(async (req, res) => {
    const estado = toBoolean(req.body.estado);
    const data = await productService.updateProductStatus({
        id: toPositiveInteger(req.params.id, "ID de producto"),
        tiendaId: requireStore(req),
        estado
    });

    return success(res, {
        message: `Producto ${estado ? "habilitado" : "deshabilitado"} correctamente`,
        data
    });
});

module.exports = {
    registrarProducto,
    listarProductos,
    listarProductosActivos,
    buscarProductoPorId,
    obtenerSugerencias,
    buscarProductos,
    obtenerProductoPorCodigo,
    editarProducto,
    cambiarEstadoProducto
};
