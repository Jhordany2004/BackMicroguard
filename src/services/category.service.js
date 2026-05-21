const categoryRepository = require("../repositories/category.repository");
const { badRequest, notFound } = require("../utils/AppError");
const { normalizeText } = require("../utils/validators");
const { mapPostgresError } = require("../utils/postgresError");

const formatCategory = (category) => ({
    id: Number(category.id),
    nombre: category.nombre,
    descripcion: category.descripcion || "",
    estado: category.estado,
    fechaRegistro: category.fecha_registro,
    fechaModificacion: category.fecha_modificacion
});

const duplicateMessage = {
    unique: "Ya existe una categoria con ese nombre"
};

const createCategory = async ({ tiendaId, body }) => {
    const nombre = normalizeText(body.nombre);
    const descripcion = normalizeText(body.descripcion);

    if (!nombre) {
        throw badRequest("El nombre es obligatorio");
    }

    try {
        const category = await categoryRepository.create({ tiendaId, nombre, descripcion });
        return { categoria: formatCategory(category) };
    } catch (error) {
        mapPostgresError(error, duplicateMessage);
    }
};

const listCategories = async (tiendaId) => {
    const categories = await categoryRepository.findAllByStore(tiendaId);
    return {
        categorias: categories.map(formatCategory),
        empty: categories.length === 0
    };
};

const listActiveCategories = async (tiendaId) => {
    const categories = await categoryRepository.findActiveByStore(tiendaId);
    return {
        categorias: categories.map(formatCategory),
        empty: categories.length === 0
    };
};

const listInactiveCategories = async (tiendaId) => {
    const categories = await categoryRepository.findInactiveByStore(tiendaId);
    return {
        categorias: categories.map(formatCategory),
        empty: categories.length === 0
    };
};

const getCategory = async ({ id, tiendaId }) => {
    const category = await categoryRepository.findByIdAndStore(id, tiendaId);

    if (!category) {
        throw notFound("Categoria no encontrada");
    }

    return { categoria: formatCategory(category) };
};

const updateCategory = async ({ id, tiendaId, body }) => {
    const nombre = normalizeText(body.nombre);
    const descripcion = normalizeText(body.descripcion);

    if (!nombre && !descripcion) {
        throw badRequest("Debe enviar nombre o descripcion para actualizar");
    }

    const current = await categoryRepository.findByIdAndStore(id, tiendaId);

    if (!current) {
        throw notFound("Categoria no encontrada");
    }

    try {
        const category = await categoryRepository.update({
            id,
            tiendaId,
            nombre: nombre || current.nombre,
            descripcion: descripcion || current.descripcion
        });

        return { categoria: formatCategory(category) };
    } catch (error) {
        mapPostgresError(error, duplicateMessage);
    }
};

const updateCategoryStatus = async ({ id, tiendaId, estado }) => {
    const current = await categoryRepository.findByIdAndStore(id, tiendaId);

    if (!current) {
        throw notFound("Categoria no encontrada");
    }

    if (current.estado === estado) {
        throw badRequest(`La categoria ya esta ${estado ? "habilitada" : "deshabilitada"}`);
    }

    const category = await categoryRepository.updateStatus({ id, tiendaId, estado });
    return { categoria: formatCategory(category) };
};

module.exports = {
    createCategory,
    listCategories,
    listActiveCategories,
    listInactiveCategories,
    getCategory,
    updateCategory,
    updateCategoryStatus
};
