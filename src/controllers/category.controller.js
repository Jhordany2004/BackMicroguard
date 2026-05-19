const categoryService = require("../services/category.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { created, success } = require("../utils/handleResponse");
const { requireStore, toBoolean, toPositiveInteger } = require("../utils/validators");

const registrarCategoria = asyncHandler(async (req, res) => {
    const data = await categoryService.createCategory({
        tiendaId: requireStore(req),
        body: req.body
    });

    return created(res, {
        message: "Categoria registrada correctamente",
        data
    });
});

const listarCategoria = asyncHandler(async (req, res) => {
    const result = await categoryService.listCategories(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay categorias registradas" : "Categorias obtenidas correctamente",
        data: { categorias: result.categorias }
    });
});

const obtenerCategoria = asyncHandler(async (req, res) => {
    const result = await categoryService.listActiveCategories(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay categorias activas" : "Categorias activas obtenidas correctamente",
        data: { categorias: result.categorias }
    });
});

const obtenerCategoriasInactivas = asyncHandler(async (req, res) => {
    const result = await categoryService.listInactiveCategories(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay categorias inactivas" : "Categorias inactivas obtenidas correctamente",
        data: { categorias: result.categorias }
    });
});

const buscarCategoria = asyncHandler(async (req, res) => {
    const data = await categoryService.getCategory({
        id: toPositiveInteger(req.params.id, "ID de categoria"),
        tiendaId: requireStore(req)
    });

    return success(res, {
        message: "Categoria obtenida correctamente",
        data
    });
});

const editarCategoria = asyncHandler(async (req, res) => {
    const data = await categoryService.updateCategory({
        id: toPositiveInteger(req.params.id, "ID de categoria"),
        tiendaId: requireStore(req),
        body: req.body
    });

    return success(res, {
        message: "Categoria actualizada correctamente",
        data
    });
});

const cambiarEstadoCategoria = asyncHandler(async (req, res) => {
    const estado = toBoolean(req.body.estado);
    const data = await categoryService.updateCategoryStatus({
        id: toPositiveInteger(req.params.id, "ID de categoria"),
        tiendaId: requireStore(req),
        estado
    });

    return success(res, {
        message: `Categoria ${estado ? "habilitada" : "deshabilitada"} correctamente`,
        data
    });
});

module.exports = {
    registrarCategoria,
    obtenerCategoria,
    buscarCategoria,
    listarCategoria,
    editarCategoria,
    cambiarEstadoCategoria,
    obtenerCategoriasInactivas
};
