const crypto = require("crypto");
const purchaseRepository = require("../repositories/purchase.repository");
const { badRequest, conflict, notFound } = require("../utils/AppError");
const { normalizeText, normalizeUpper, toNumber } = require("../utils/validators");
const { withTransaction } = require("../utils/transaction");
const { mapPostgresError } = require("../utils/postgresError");

const VALID_MEASURES = ["lt", "ml", "g", "kg", "kl"];

const normalizeName = (value) => normalizeText(value).replace(/\s+/g, " ");
const normalizeMeasure = (value) => normalizeText(value).toLowerCase();
const toBoolean = (value) => (typeof value === "boolean" ? value : Boolean(value));
const decimal = (value) => (value === null || value === undefined ? null : Number(value));
const generateInternalCode = () => `INT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

const formatPurchase = (purchase) => ({
    id: purchase.id,
    proveedor: {
        id: purchase.proveedor_id,
        razonSocial: purchase.proveedor_razon_social
    },
    precioTotal: decimal(purchase.precio_total),
    estado: purchase.estado,
    fechaRegistro: purchase.fecha_registro,
    fechaModificacion: purchase.fecha_modificacion
});

const formatPurchaseDetail = (detail) => ({
    id: detail.id,
    loteId: detail.lote_id,
    producto: {
        id: detail.producto_id,
        nombre: detail.prod_nombre,
        medida: detail.prod_medida,
        codBarras: detail.prod_cod_barras
    },
    cantidadComprada: decimal(detail.cantidad_comprada),
    precioUnitario: decimal(detail.precio_unitario),
    precioTotal: decimal(detail.precio_total),
    fechaRegistro: detail.fecha_registro
});

const parseDate = (value, field, index) => {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        throw badRequest(`${field} del detalle #${index} no es valida`);
    }

    return date;
};

const parsePurchaseDetail = (detail, index) => {
    const productoId = toNumber(detail.productoId ?? detail.ProductoId ?? detail.producto_id);
    const categoriaId = toNumber(detail.categoriaId ?? detail.IdCategoria ?? detail.categoria_id);
    const nombre = normalizeName(detail.nombre ?? detail.NombreProducto);
    const codBarras = normalizeText(detail.codBarras ?? detail.CodigoBarras ?? detail.cod_barras);
    const codInterno = normalizeUpper(detail.codInterno ?? detail.CodigoInterno ?? detail.cod_interno);
    const imagenUrl = normalizeText(detail.imagenUrl ?? detail.Imagen ?? detail.imagen_url) || process.env.URL_PRODUCTO_PREDETERMINADO || null;
    const medida = normalizeMeasure(detail.medida ?? detail.Medida);
    const cantidadMedida = toNumber(detail.cantidadMedida ?? detail.CantidadMedida ?? detail.cantidad_medida);
    const cantidadComprada = toNumber(detail.cantidadComprada ?? detail.CantidadComprada ?? detail.cantidad_comprada);
    const precioCompraUnidad = toNumber(detail.precioCompraUnidad ?? detail.PrecioCompraUnidad ?? detail.precio_compra_unidad);
    const precioVentaUnidad = toNumber(detail.precioVentaUnidad ?? detail.PrecioVentaUnidad ?? detail.precio_venta_unidad);
    const perecible = toBoolean(detail.perecible ?? detail.Perecible);
    const fechaIngreso = parseDate(detail.fechaIngreso ?? detail.FechaIngreso ?? detail.fecha_ingreso, "La fecha de ingreso", index);
    const fechaVencimiento = parseDate(detail.fechaVencimiento ?? detail.FechaVencimiento ?? detail.fecha_vencimiento, "La fecha de vencimiento", index);

    if (!productoId && !nombre) {
        throw badRequest(`El nombre del producto es obligatorio en el detalle #${index}`);
    }

    if (!categoriaId) {
        throw badRequest(`La categoria es obligatoria en el detalle #${index}`);
    }

    const hasMeasure = Boolean(medida);
    const hasMeasureQuantity = cantidadMedida !== null && cantidadMedida > 0;

    if (hasMeasure !== hasMeasureQuantity) {
        throw badRequest(`El detalle #${index} debe enviar cantidad de medida y medida juntas, o dejar ambas vacias`);
    }

    if (hasMeasure && !VALID_MEASURES.includes(medida)) {
        throw badRequest(`La medida del detalle #${index} debe ser lt, ml, g, kg o kl`);
    }

    if (cantidadComprada === null || cantidadComprada <= 0) {
        throw badRequest(`La cantidad comprada debe ser mayor a cero en el detalle #${index}`);
    }

    if (precioCompraUnidad === null || precioCompraUnidad < 0) {
        throw badRequest(`El precio de compra unitario no puede ser negativo en el detalle #${index}`);
    }

    if (precioVentaUnidad === null || precioVentaUnidad < 0) {
        throw badRequest(`El precio de venta unitario no puede ser negativo en el detalle #${index}`);
    }

    if (perecible && !fechaVencimiento) {
        throw badRequest(`El detalle #${index} es perecible y requiere fecha de vencimiento`);
    }

    if (fechaIngreso && fechaVencimiento && fechaVencimiento < fechaIngreso) {
        throw badRequest(`La fecha de vencimiento del detalle #${index} no puede ser menor a la fecha de ingreso`);
    }

    return {
        productoId,
        categoriaId,
        nombre,
        codBarras: codBarras || null,
        codInterno: codInterno || null,
        imagenUrl,
        cantidadMedida: hasMeasureQuantity ? cantidadMedida : null,
        medida: hasMeasure ? medida : null,
        cantidadComprada,
        precioCompraUnidad,
        precioVentaUnidad,
        perecible,
        fechaIngreso: fechaIngreso || new Date(),
        fechaVencimiento
    };
};

const findExistingProduct = async (client, detail, tiendaId) => {
    if (detail.productoId) {
        return purchaseRepository.findProductById(client, detail.productoId, tiendaId);
    }

    if (detail.codBarras) {
        const product = await purchaseRepository.findProductByBarcode(client, tiendaId, detail.codBarras);
        if (product) return product;
    }

    return purchaseRepository.findProductByPresentation(client, tiendaId, detail);
};

const assertProductCompatibility = (product, detail, index) => {
    if (Number(product.categoria_id) !== Number(detail.categoriaId)) {
        throw conflict(`La categoria del detalle #${index} no coincide con el producto existente`);
    }

    if (product.cantidad_medida !== null && Number(product.cantidad_medida) !== Number(detail.cantidadMedida)) {
        throw conflict(`La presentacion del detalle #${index} no coincide con el producto existente`);
    }

    if (product.cantidad_medida === null && detail.cantidadMedida !== null) {
        throw conflict(`La presentacion del detalle #${index} no coincide con el producto existente`);
    }

    if ((product.medida || null) !== (detail.medida || null)) {
        throw conflict(`La presentacion del detalle #${index} no coincide con el producto existente`);
    }

    if (detail.codBarras && product.cod_barras && product.cod_barras !== detail.codBarras) {
        throw conflict(`El codigo de barras del detalle #${index} no coincide con el producto existente`);
    }
};

const getPurchaseWithDetails = async ({ id, tiendaId }) => {
    const purchase = await purchaseRepository.findPurchaseByIdAndStore(id, tiendaId);

    if (!purchase) return null;

    const details = await purchaseRepository.findPurchaseDetails(id);

    return {
        compra: formatPurchase(purchase),
        detalles: details.map(formatPurchaseDetail)
    };
};

const createPurchase = async ({ tiendaId, usuarioId, body }) => {
    const proveedorId = toNumber(body.proveedorId ?? body.proveedor_id ?? body.proveedor ?? body.Proveedor);
    const detalles = body.detalles;

    if (!proveedorId || !Array.isArray(detalles) || detalles.length === 0) {
        throw badRequest("Proveedor y detalles son obligatorios");
    }

    try {
        return await withTransaction(async (client) => {
            const supplier = await purchaseRepository.findSupplier(client, proveedorId, tiendaId);

            if (!supplier) {
                throw notFound("Proveedor no encontrado o inactivo");
            }

            const preparedDetails = [];
            let purchaseTotal = 0;

            for (const [index, originalDetail] of detalles.entries()) {
                const detailNumber = index + 1;
                const detail = parsePurchaseDetail(originalDetail, detailNumber);
                const existsCategory = await purchaseRepository.categoryExists(client, detail.categoriaId, tiendaId);

                if (!existsCategory) {
                    throw notFound(`La categoria del detalle #${detailNumber} no existe o esta inactiva`);
                }

                let product = await findExistingProduct(client, detail, tiendaId);

                if (product) {
                    assertProductCompatibility(product, detail, detailNumber);
                    product = await purchaseRepository.updateProduct(client, product, detail);
                } else {
                    product = await purchaseRepository.createProduct(client, detail, tiendaId, generateInternalCode());
                }

                const lot = await purchaseRepository.createLot(client, detail, product.id);
                const detailTotal = detail.cantidadComprada * detail.precioCompraUnidad;
                purchaseTotal += detailTotal;

                preparedDetails.push({
                    loteId: lot.id,
                    productoId: product.id,
                    cantidadComprada: detail.cantidadComprada,
                    precioUnitario: detail.precioCompraUnidad,
                    precioTotal: detailTotal,
                    prodNombre: product.nombre,
                    prodMedida: product.medida,
                    prodCodBarras: product.cod_barras
                });
            }

            const purchase = await purchaseRepository.createPurchase(client, {
                tiendaId,
                proveedorId: supplier.id,
                usuarioId,
                precioTotal: purchaseTotal
            });

            for (const detail of preparedDetails) {
                await purchaseRepository.createPurchaseDetail(client, purchase.id, detail);
            }

            return purchase.id;
        }).then((purchaseId) => getPurchaseWithDetails({ id: purchaseId, tiendaId }));
    } catch (error) {
        mapPostgresError(error, {
            unique: "Existe un registro duplicado en la compra",
            foreignKey: "Uno de los datos relacionados no existe",
            check: "Los datos de la compra no cumplen las reglas de la base de datos"
        });
    }
};

const listPurchases = async (tiendaId) => {
    const purchases = await purchaseRepository.findAllByStore(tiendaId);

    return {
        compras: purchases.map(formatPurchase),
        empty: purchases.length === 0
    };
};

const getPurchase = async ({ id, tiendaId }) => {
    const purchase = await getPurchaseWithDetails({ id, tiendaId });

    if (!purchase) {
        throw notFound("Compra no encontrada");
    }

    return purchase;
};

const updatePurchaseStatus = async ({ id, tiendaId, estado }) => {
    const updated = await purchaseRepository.updateStatus({ id, tiendaId, estado });

    if (!updated) {
        throw notFound("Compra no encontrada");
    }

    return getPurchaseWithDetails({ id, tiendaId });
};

module.exports = {
    createPurchase,
    listPurchases,
    getPurchase,
    updatePurchaseStatus
};
