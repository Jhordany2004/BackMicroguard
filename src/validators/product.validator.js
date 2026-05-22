const { z, idParamsSchema, statusBodySchema, optionalNumeric } = require("./common.validator");

const processEmptyToUndefined = (v) => (typeof v === 'string' && v.trim() === '') ? undefined : v;

const productPayloadSchema = z.object({
    categoriaId: optionalNumeric,
    categoria_id: optionalNumeric,
    nombre: z.string().trim().optional(),
    codBarras: z.string().trim().optional().nullable(),
    cod_barras: z.string().trim().optional().nullable(),
    codInterno: z.string().trim().optional(),
    cod_interno: z.string().trim().optional(),
    imagenUrl: z.string().trim().optional().nullable(),
    imagen_url: z.string().trim().optional().nullable(),
    cantidadMedida: optionalNumeric,
    cantidad_medida: optionalNumeric,
    medida: z.string().trim().optional().nullable(),
    precioVenta: optionalNumeric,
    precio_venta: optionalNumeric,
    perecible: z.boolean().optional()
}).passthrough();

const hasAny = (data, fields) => fields.some((field) => data[field] !== undefined && data[field] !== null && data[field] !== "");

const createProductSchema = productPayloadSchema
    .refine((data) => hasAny(data, ["categoriaId", "categoria_id"]), "La categoria es obligatoria")
    .refine((data) => hasAny(data, ["nombre"]), "El nombre es obligatorio")
    .refine((data) => hasAny(data, ["codInterno", "cod_interno"]), "El codigo interno es obligatorio")
    .refine((data) => hasAny(data, ["precioVenta", "precio_venta"]), "El precio de venta es obligatorio");

const suggestionsQuerySchema = z.object({
    query: z.string().trim().min(2, "La consulta debe tener al menos 2 caracteres"),
    categoria: optionalNumeric,
    limit: optionalNumeric
}).passthrough();

const searchProductsQuerySchema = z.object({
    query: z.string().trim().optional(),
    categoria: z.preprocess(
        processEmptyToUndefined,
        z.union([
            z.string().regex(/^\d+$/, "Debe ser numerico"),
            z.number().int("Debe ser entero")
        ]).optional()
    ),
    limit: optionalNumeric,
    page: optionalNumeric
}).passthrough();

const codeParamsSchema = z.object({
    codigo: z.string().trim().min(1, "El codigo es obligatorio")
});

module.exports = {
    idParamsSchema,
    statusBodySchema,
    createProductSchema,
    productPayloadSchema,
    suggestionsQuerySchema,
    searchProductsQuerySchema,
    codeParamsSchema
};
