const { z, optionalNumeric } = require("./common.validator");

const createOperationSchema = z.object({
    razon: z.enum(["Error logistico", "Producto danado", "Traspaso", "Otro"], {
        error: "Razon invalida"
    }),
    descripcion: z.string().trim().optional().nullable(),
    cantidad: optionalNumeric,
    loteId: optionalNumeric,
    lote_id: optionalNumeric
}).passthrough()
    .refine((data) => data.cantidad !== undefined && data.cantidad !== null && data.cantidad !== "", "La cantidad es obligatoria")
    .refine((data) => data.loteId || data.lote_id, "El lote es obligatorio")
    .refine((data) => data.razon !== "Otro" || Boolean(data.descripcion), "La descripcion es obligatoria cuando la razon es Otro");

module.exports = { createOperationSchema };
