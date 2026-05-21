const productRepository = require("../repositories/product.repository");
const { badRequest, notFound } = require("../utils/AppError");
const { normalizeText, normalizeUpper, toNumber } = require("../utils/validators");
const { mapPostgresError } = require("../utils/postgresError");

const LIMIT_MIN = 1;
const LIMIT_MAX = 20;
const ALLOWED_MEASURES = ["lt", "ml", "g", "kg", "kl"];

const decimal = (value) => (value === null || value === undefined ? null : Number(value));

const formatProduct = (product) => ({
    id: Number(product.id),
    nombre: product.nombre,
    codBarras: product.cod_barras || null,
    codInterno: product.cod_interno,
    imagenUrl: product.imagen_url || null,
    cantidadMedida: decimal(product.cantidad_medida),
    medida: product.medida,
    precioVenta: decimal(product.precio_venta),
    perecible: product.perecible,
    estado: product.estado,
    categoria: product.categoria_id
        ? {
            id: product.categoria_id,
            nombre: product.categoria_nombre || null
        }
        : null,
    fechaRegistro: product.fecha_registro,
    fechaModificacion: product.fecha_modificacion
});

const normalizeBoolean = (value, fallback = false) => {
    if (typeof value === "boolean") return value;
    return fallback;
};

const buildProductData = (body, current = {}) => {
    const categoriaId = body.categoriaId ?? body.categoria_id ?? current.categoria_id;
    const cantidadMedida = toNumber(body.cantidadMedida ?? body.cantidad_medida ?? current.cantidad_medida, null);
    const medida = normalizeText(body.medida ?? current.medida).toLowerCase();

    return {
        categoriaId: Number(categoriaId),
        nombre: normalizeText(body.nombre ?? current.nombre),
        codBarras: normalizeText(body.codBarras ?? body.cod_barras ?? current.cod_barras) || null,
        codInterno: normalizeUpper(body.codInterno ?? body.cod_interno ?? current.cod_interno),
        imagenUrl: normalizeText(body.imagenUrl ?? body.imagen_url ?? current.imagen_url) || null,
        cantidadMedida,
        medida: medida || null,
        precioVenta: toNumber(body.precioVenta ?? body.precio_venta ?? current.precio_venta, null),
        perecible: normalizeBoolean(body.perecible ?? current.perecible, false)
    };
};

const validateProductData = async (data, tiendaId) => {
    if (!Number.isInteger(data.categoriaId) || data.categoriaId <= 0) {
        throw badRequest("La categoria es obligatoria");
    }

    if (!data.nombre || !data.codInterno || data.precioVenta === null) {
        throw badRequest("Nombre, codigo interno y precio de venta son obligatorios");
    }

    if (data.precioVenta < 0) {
        throw badRequest("El precio de venta no puede ser negativo");
    }

    const hasQuantity = data.cantidadMedida !== null;
    const hasMeasure = Boolean(data.medida);

    if (hasQuantity !== hasMeasure) {
        throw badRequest("Debe enviar cantidad de medida y medida juntas, o dejar ambas vacias");
    }

    if (data.cantidadMedida !== null && data.cantidadMedida <= 0) {
        throw badRequest("La cantidad de medida debe ser mayor a cero");
    }

    if (data.medida && !ALLOWED_MEASURES.includes(data.medida)) {
        throw badRequest("La medida debe ser lt, ml, g, kg o kl");
    }

    const category = await productRepository.findCategoryActiveByStore(data.categoriaId, tiendaId);

    if (!category) {
        throw notFound("Categoria no encontrada o inactiva");
    }
};

const getLimit = (value, fallback = 10) => Math.min(
    LIMIT_MAX,
    Math.max(LIMIT_MIN, toNumber(value, fallback))
);

const pgMessages = {
    unique: "Ya existe un producto con ese codigo interno o codigo de barras",
    foreignKey: "La categoria enviada no existe",
    check: "Los datos del producto no cumplen las reglas de la base de datos"
};

const createProduct = async ({ tiendaId, body }) => {
    const data = buildProductData(body);
    await validateProductData(data, tiendaId);

    try {
        const { id } = await productRepository.create({ tiendaId, data });
        const product = await productRepository.findByIdAndStore(id, tiendaId);
        return { producto: formatProduct(product) };
    } catch (error) {
        mapPostgresError(error, pgMessages);
    }
};

const listProducts = async (tiendaId) => {
    const products = await productRepository.findAllByStore(tiendaId);
    return {
        productos: products.map(formatProduct),
        empty: products.length === 0
    };
};

const listActiveProducts = async (tiendaId) => {
    const products = await productRepository.findActiveByStore(tiendaId);
    return {
        productos: products.map(formatProduct),
        empty: products.length === 0
    };
};

const getProduct = async ({ id, tiendaId }) => {
    const product = await productRepository.findByIdAndStore(id, tiendaId);

    if (!product) {
        throw notFound("Producto no encontrado");
    }

    return { producto: formatProduct(product) };
};

const getSuggestions = async ({ tiendaId, query }) => {
    const text = normalizeText(query.query);
    const categoriaId = toNumber(query.categoria, null);
    const limit = getLimit(query.limit, 5);

    if (!text || text.length < 2) {
        throw badRequest("La consulta debe tener al menos 2 caracteres");
    }

    const products = await productRepository.findSuggestions({ tiendaId, text, categoriaId, limit });

    return {
        productos: products.map((product) => ({
            ...formatProduct(product),
            exacto: product.nombre.toLowerCase() === text.toLowerCase()
        })),
        empty: products.length === 0
    };
};

const searchProducts = async ({ tiendaId, query }) => {
    const text = normalizeText(query.query);
    const categoriaId = toNumber(query.categoria, null);
    const limit = getLimit(query.limit, 10);
    const page = Math.max(1, toNumber(query.page, 1));
    const offset = (page - 1) * limit;
    const { rows, total } = await productRepository.search({ tiendaId, text, categoriaId, limit, offset });

    return {
        productos: rows.map(formatProduct),
        paginacion: {
            pagina: page,
            limite: limit,
            total,
            totalPaginas: Math.ceil(total / limit)
        },
        empty: rows.length === 0
    };
};

const getProductByCode = async ({ tiendaId, code }) => {
    const codigo = normalizeText(code);

    if (!codigo) {
        throw badRequest("El codigo es obligatorio");
    }

    const product = await productRepository.findByCode({
        tiendaId,
        codigo,
        codigoInterno: normalizeUpper(codigo)
    });

    if (!product) {
        throw notFound("No existe un producto con ese codigo");
    }

    return { producto: formatProduct(product) };
};

const updateProduct = async ({ id, tiendaId, body }) => {
    const current = await productRepository.findEditableByIdAndStore(id, tiendaId);

    if (!current) {
        throw notFound("Producto no encontrado");
    }

    const data = buildProductData(body, current);
    await validateProductData(data, tiendaId);

    try {
        await productRepository.update({ id, tiendaId, data });
        const product = await productRepository.findByIdAndStore(id, tiendaId);
        return { producto: formatProduct(product) };
    } catch (error) {
        mapPostgresError(error, pgMessages);
    }
};

const updateProductStatus = async ({ id, tiendaId, estado }) => {
    const current = await productRepository.findEditableByIdAndStore(id, tiendaId);

    if (!current) {
        throw notFound("Producto no encontrado");
    }

    if (current.estado === estado) {
        throw badRequest(`El producto ya esta ${estado ? "habilitado" : "deshabilitado"}`);
    }

    await productRepository.updateStatus({ id, tiendaId, estado });
    const product = await productRepository.findByIdAndStore(id, tiendaId);
    return { producto: formatProduct(product) };
};

module.exports = {
    createProduct,
    listProducts,
    listActiveProducts,
    getProduct,
    getSuggestions,
    searchProducts,
    getProductByCode,
    updateProduct,
    updateProductStatus
};
