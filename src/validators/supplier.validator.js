const { z, idParamsSchema, statusBodySchema } = require("./common.validator");

const createSupplierSchema = z.object({
    tipoProveedor: z.enum(["Natural", "Empresa"], {
        error: "Tipo de proveedor invalido"
    }),
    tipoDocumento: z.enum(["DNI", "RUC", "CE"]).optional(),
    tipo_documento: z.enum(["DNI", "RUC", "CE"]).optional(),
    documento: z.string().trim().min(1, "El documento es obligatorio"),
    razonSocial: z.string().trim().min(1, "La razon social es obligatoria"),
    telefono: z.string().trim().optional()
}).passthrough();

const updateSupplierSchema = z.object({
    razonSocial: z.string().trim().optional(),
    telefono: z.string().trim().optional()
}).passthrough().refine(
    (data) => Boolean(data.razonSocial || data.telefono),
    "Debe enviar razon social o telefono para actualizar"
);

const searchSupplierQuerySchema = z.object({
    documento: z.string().trim().optional(),
    razonSocial: z.string().trim().optional()
}).passthrough().refine(
    (data) => Boolean(data.documento || data.razonSocial),
    "Debe enviar documento o razon social para buscar"
);

module.exports = {
    idParamsSchema,
    statusBodySchema,
    createSupplierSchema,
    updateSupplierSchema,
    searchSupplierQuerySchema
};
