const inventoryRepository = require("../repositories/inventory.repository");
const { badRequest, notFound } = require("../utils/AppError");
const { normalizeText, toNumber } = require("../utils/validators");

const INVENTORY_STATES = {
    AGOTADO: 1,
    PROXIMO_A_VENCER: 2,
    STOCK_BAJO: 3,
    EXCEDENTE: 4,
    STOCK_OPTIMO: 5
};

const STATE_LABELS = {
    1: "Agotado",
    2: "Proximo a Vencer",
    3: "Stock Bajo",
    4: "Excedente",
    5: "Stock Optimo"
};

const decimal = (value) => (value === null || value === undefined ? null : Number(value));

const toQueryBoolean = (value) => {
    if (value === undefined || value === null || value === "") return null;
    if (value === "true" || value === true) return true;
    if (value === "false" || value === false) return false;
    return null;
};

const formatInventoryProduct = (product) => ({
    id: product.id,
    nombre: product.nombre,
    imagenUrl: product.imagen_url || null,
    cantidadMedida: decimal(product.cantidad_medida),
    medida: product.medida,
    stockTotal: decimal(product.stock_total) || 0,
    totalLotes: Number(product.total_lotes) || 0,
    proximaFechaVencimiento: product.proxima_fecha_vencimiento,
    estadoInventario: product.estado_inventario,
    estadoInventarioTexto: STATE_LABELS[product.estado_inventario],
    categoria: {
        id: product.categoria_id,
        nombre: product.categoria_nombre
    }
});

const formatLot = (lot) => ({
    id: lot.id,
    numeroLote: `Lote #${lot.numero_lote}`,
    stockInicial: decimal(lot.stock_inicial),
    stockActual: decimal(lot.stock_actual),
    precioCompra: decimal(lot.precio_compra),
    fechaIngreso: lot.fecha_ingreso,
    fechaVencimiento: lot.fecha_vencimiento,
    estadoLote: lot.estado_lote
});

const getStoreConfig = async (tiendaId) => {
    const config = await inventoryRepository.findStoreConfig(tiendaId);

    if (!config) {
        throw notFound("Tienda no encontrada");
    }

    return config;
};

const searchInventoryProducts = async ({ tiendaId, query }) => {
    const config = await getStoreConfig(tiendaId);
    const categoriaId = toNumber(query.idcategoria ?? query.categoriaId, null);
    const nombreProducto = normalizeText(query.nombreProducto ?? query.query);
    const estado = toNumber(query.estado, null);
    const perecible = toQueryBoolean(query.perecible);
    const pagina = Math.max(1, toNumber(query.pagina, 1));
    const limite = Math.min(50, Math.max(1, toNumber(query.limite, 10)));
    const offset = (pagina - 1) * limite;

    if (estado !== null && !Object.values(INVENTORY_STATES).includes(estado)) {
        throw badRequest("Estado invalido. Los valores permitidos son del 1 al 5");
    }

    const filters = [];
    const values = [tiendaId, config.dias_alerta_vencimiento, config.stock_minimo];

    if (categoriaId) {
        values.push(categoriaId);
        filters.push(`categoria_id = $${values.length}`);
    }

    if (nombreProducto) {
        values.push(`%${nombreProducto}%`);
        filters.push(`nombre ILIKE $${values.length}`);
    }

    if (perecible !== null) {
        values.push(perecible);
        filters.push(`perecible = $${values.length}`);
    }

    if (estado !== null) {
        values.push(estado);
        filters.push(`estado_inventario = $${values.length}`);
    }

    const { rows, total } = await inventoryRepository.searchProducts({
        values,
        filters,
        limit: limite,
        offset
    });

    return {
        productos: rows.map(formatInventoryProduct),
        paginacion: {
            total,
            pagina,
            limite,
            totalPaginas: Math.ceil(total / limite)
        },
        empty: rows.length === 0
    };
};

const getProductDetail = async ({ tiendaId, productId, query }) => {
    const config = await getStoreConfig(tiendaId);
    const product = await inventoryRepository.findProductInventory({ tiendaId, config, productId });

    if (!product) {
        throw notFound("Producto no encontrado");
    }

    const estadoLote = normalizeText(query.estadoLote);
    const fechaDesde = normalizeText(query.fechaDesde);
    const fechaHasta = normalizeText(query.fechaHasta);
    const filters = ["producto_id = $1", "estado = TRUE"];
    const values = [productId];

    if (fechaDesde) {
        values.push(fechaDesde);
        filters.push(`fecha_vencimiento::date >= $${values.length}::date`);
    }

    if (fechaHasta) {
        values.push(fechaHasta);
        filters.push(`fecha_vencimiento::date <= $${values.length}::date`);
    }

    const lots = await inventoryRepository.findProductLots({
        productId,
        alertDays: config.dias_alerta_vencimiento,
        filters,
        values,
        estadoLote
    });

    return {
        producto: {
            ...formatInventoryProduct(product),
            precioVenta: decimal(product.precio_venta),
            codBarras: product.cod_barras || null,
            codInterno: product.cod_interno,
            perecible: product.perecible,
            lotes: lots.map(formatLot)
        }
    };
};

const getAvailableStates = async (tiendaId) => {
    const config = await getStoreConfig(tiendaId);
    const states = await inventoryRepository.findAvailableStates({ tiendaId, config });

    return {
        estados: states.map((row) => ({
            valor: row.estado_inventario,
            label: STATE_LABELS[row.estado_inventario]
        }))
    };
};

const getProductState = async ({ tiendaId, productId }) => {
    const config = await getStoreConfig(tiendaId);
    const state = await inventoryRepository.findProductState({ tiendaId, config, productId });

    if (!state) {
        throw notFound("Producto no encontrado");
    }

    return {
        estado: {
            valor: state.estado_inventario,
            label: STATE_LABELS[state.estado_inventario]
        }
    };
};

module.exports = {
    searchInventoryProducts,
    getProductDetail,
    getAvailableStates,
    getProductState
};
