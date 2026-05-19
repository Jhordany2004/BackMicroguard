const salesRepository = require("../repositories/sales.repository");
const { badRequest, notFound } = require("../utils/AppError");
const { normalizeText, toNumber } = require("../utils/validators");
const { withTransaction } = require("../utils/transaction");
const { mapPostgresError } = require("../utils/postgresError");

const VALID_RECEIPT_TYPES = ["Ticket", "Boleta", "Factura", "Nota de venta"];

const decimal = (value) => (value === null || value === undefined ? null : Number(value));

const formatSale = (sale) => ({
    id: sale.id,
    cliente: sale.cliente_id
        ? {
            id: sale.cliente_id,
            nombres: sale.cliente_nombres,
            apellidos: sale.cliente_apellidos,
            nombre: sale.cliente_nombres,
            apellido: sale.cliente_apellidos,
            razonSocial: sale.cliente_razon_social,
            documento: sale.cliente_documento
        }
        : null,
    metodoPago: {
        id: sale.metodo_pago_id,
        nombre: sale.metodo_pago_nombre
    },
    precioTotal: decimal(sale.precio_total),
    tipoComprobante: sale.tipo_comprobante,
    serie: sale.serie,
    correlativo: sale.correlativo,
    estado: sale.estado,
    fechaRegistro: sale.fecha_registro,
    fechaModificacion: sale.fecha_modificacion
});

const formatSaleDetail = (detail) => ({
    id: detail.id,
    loteId: detail.lote_id,
    producto: {
        id: detail.producto_id,
        nombre: detail.prod_nombre,
        medida: detail.prod_medida,
        codBarras: detail.prod_cod_barras
    },
    cantidad: decimal(detail.cantidad),
    precioUnitario: decimal(detail.precio_unitario),
    precioTotal: decimal(detail.precio_total),
    fechaRegistro: detail.fecha_registro
});

const getSaleWithDetails = async ({ id, tiendaId }) => {
    const sale = await salesRepository.findSaleByIdAndStore(id, tiendaId);

    if (!sale) return null;

    const details = await salesRepository.findSaleDetails(id);

    return {
        venta: formatSale(sale),
        detalles: details.map(formatSaleDetail)
    };
};

const createSale = async ({ tiendaId, usuarioId, body }) => {
    const clienteId = toNumber(body.clienteId ?? body.cliente_id ?? body.Cliente);
    const metodoPagoId = toNumber(body.metodoPagoId ?? body.metodo_pago_id ?? body.MetodoPago);
    const detalles = body.detalles;
    const tipoComprobante = normalizeText(body.tipoComprobante ?? body.tipo_comprobante) || "Ticket";
    const serie = normalizeText(body.serie) || null;
    const correlativo = toNumber(body.correlativo);

    if (!metodoPagoId || !Array.isArray(detalles) || detalles.length === 0) {
        throw badRequest("Metodo de pago y detalles son obligatorios");
    }

    if (!VALID_RECEIPT_TYPES.includes(tipoComprobante)) {
        throw badRequest("Tipo de comprobante invalido");
    }

    try {
        return await withTransaction(async (client) => {
            const customer = await salesRepository.findCustomer(client, clienteId, tiendaId);

            if (clienteId && !customer) {
                throw notFound("Cliente no encontrado o inactivo");
            }

            const paymentMethod = await salesRepository.findPaymentMethod(client, metodoPagoId, tiendaId);

            if (!paymentMethod) {
                throw notFound("Metodo de pago no encontrado o inactivo");
            }

            const preparedDetails = [];
            let saleTotal = 0;

            for (const [index, detail] of detalles.entries()) {
                const detailNumber = index + 1;
                const loteId = toNumber(detail.loteId ?? detail.lote_id ?? detail.lote);
                const cantidad = toNumber(detail.cantidad);
                const sentUnitPrice = toNumber(detail.precioUnitario ?? detail.precio_unitario);

                if (!loteId || cantidad === null || cantidad <= 0) {
                    throw badRequest(`El detalle #${detailNumber} tiene lote o cantidad invalida`);
                }

                const lot = await salesRepository.findLotForSale(client, loteId, tiendaId);

                if (!lot) {
                    throw notFound(`Lote no encontrado en el detalle #${detailNumber}`);
                }

                if (Number(lot.stock_actual) < cantidad) {
                    throw badRequest(`Stock insuficiente en el lote del detalle #${detailNumber}`);
                }

                const unitPrice = sentUnitPrice !== null ? sentUnitPrice : Number(lot.precio_venta);

                if (unitPrice < 0) {
                    throw badRequest(`El precio unitario del detalle #${detailNumber} no puede ser negativo`);
                }

                await salesRepository.decreaseLotStock(client, lot.id, cantidad);

                const detailTotal = cantidad * unitPrice;
                saleTotal += detailTotal;

                preparedDetails.push({
                    loteId: lot.id,
                    productoId: lot.producto_id,
                    cantidad,
                    precioUnitario: unitPrice,
                    precioTotal: detailTotal,
                    prodNombre: lot.producto_nombre,
                    prodMedida: lot.medida,
                    prodCodBarras: lot.cod_barras
                });
            }

            const sale = await salesRepository.createSale(client, {
                tiendaId,
                usuarioId,
                clienteId: customer?.id || null,
                metodoPagoId: paymentMethod.id,
                tipoComprobante,
                serie,
                correlativo,
                precioTotal: saleTotal
            });

            for (const detail of preparedDetails) {
                await salesRepository.createSaleDetail(client, sale.id, detail);
            }

            return sale.id;
        }).then((saleId) => getSaleWithDetails({ id: saleId, tiendaId }));
    } catch (error) {
        mapPostgresError(error, {
            foreignKey: "Uno de los datos relacionados no existe",
            check: "Los datos de la venta no cumplen las reglas de la base de datos"
        });
    }
};

const listSales = async (tiendaId) => {
    const sales = await salesRepository.findAllByStore(tiendaId);

    return {
        ventas: sales.map(formatSale),
        empty: sales.length === 0
    };
};

const getSale = async ({ id, tiendaId }) => {
    const sale = await getSaleWithDetails({ id, tiendaId });

    if (!sale) {
        throw notFound("Venta no encontrada");
    }

    return sale;
};

const updateSaleStatus = async ({ id, tiendaId, estado }) => {
    const updated = await salesRepository.updateStatus({ id, tiendaId, estado });

    if (!updated) {
        throw notFound("Venta no encontrada");
    }

    return getSaleWithDetails({ id, tiendaId });
};

module.exports = {
    createSale,
    listSales,
    getSale,
    updateSaleStatus
};
