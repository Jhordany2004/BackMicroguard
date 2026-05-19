const { z, idParamsSchema, statusBodySchema, optionalNumeric } = require("./common.validator");

const saleDetailSchema = z.object({
    loteId: optionalNumeric,
    lote_id: optionalNumeric,
    lote: optionalNumeric,
    cantidad: optionalNumeric,
    precioUnitario: optionalNumeric,
    precio_unitario: optionalNumeric
}).passthrough()
    .refine((data) => data.loteId || data.lote_id || data.lote, "El lote es obligatorio")
    .refine((data) => data.cantidad !== undefined && data.cantidad !== null && data.cantidad !== "", "La cantidad es obligatoria");

const createSaleSchema = z.object({
    clienteId: optionalNumeric,
    cliente_id: optionalNumeric,
    Cliente: optionalNumeric,
    metodoPagoId: optionalNumeric,
    metodo_pago_id: optionalNumeric,
    MetodoPago: optionalNumeric,
    detalles: z.array(saleDetailSchema).min(1, "Debe enviar al menos un detalle"),
    tipoComprobante: z.enum(["Ticket", "Boleta", "Factura", "Nota de venta"]).optional(),
    tipo_comprobante: z.enum(["Ticket", "Boleta", "Factura", "Nota de venta"]).optional(),
    serie: z.string().trim().optional().nullable(),
    correlativo: optionalNumeric
}).passthrough()
    .refine((data) => data.metodoPagoId || data.metodo_pago_id || data.MetodoPago, "Metodo de pago es obligatorio");

module.exports = {
    idParamsSchema,
    statusBodySchema,
    createSaleSchema
};
