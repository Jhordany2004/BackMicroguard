const { z, idParamsSchema, statusBodySchema } = require("./common.validator");

const customerPayloadSchema = z.object({
    tipoCliente: z.enum(["General", "Natural", "Empresa"]).optional(),
    tipo_cliente: z.enum(["General", "Natural", "Empresa"]).optional(),
    tipoDocumento: z.enum(["DNI", "RUC"]).optional(),
    tipo_documento: z.enum(["DNI", "RUC"]).optional(),
    documento: z.string().trim().optional().nullable(),
    nombres: z.string().trim().optional().nullable(),
    nombre: z.string().trim().optional().nullable(),
    apellidos: z.string().trim().optional().nullable(),
    apellido: z.string().trim().optional().nullable(),
    razonSocial: z.string().trim().optional().nullable(),
    razon_social: z.string().trim().optional().nullable(),
    telefono: z.string().trim().optional().nullable()
}).passthrough();

const createCustomerSchema = customerPayloadSchema.refine((data) => {
    const tipoCliente = data.tipoCliente || data.tipo_cliente;
    const hasNaturalName = Boolean(data.nombres || data.nombre);
    const hasBusinessName = Boolean(data.razonSocial || data.razon_social);

    return tipoCliente === "General" || hasNaturalName || hasBusinessName;
}, "Debe enviar nombres para cliente natural o razon social para empresa");

const searchCustomerQuerySchema = z.object({
    documento: z.string().trim().optional(),
    nombre: z.string().trim().optional()
}).passthrough().refine(
    (data) => Boolean(data.documento || data.nombre),
    "Debe enviar documento o nombre para buscar"
);

module.exports = {
    idParamsSchema,
    statusBodySchema,
    createCustomerSchema,
    updateCustomerSchema: customerPayloadSchema,
    searchCustomerQuerySchema
};
