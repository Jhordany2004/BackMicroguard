const { z, idParamsSchema, optionalNumeric } = require("./common.validator");

const inventoryQuerySchema = z.object({
    idcategoria: optionalNumeric,
    categoriaId: optionalNumeric,
    nombreProducto: z.string().trim().optional(),
    query: z.string().trim().optional(),
    estado: optionalNumeric,
    perecible: z.enum(["true", "false"]).optional(),
    pagina: optionalNumeric,
    limite: optionalNumeric
}).passthrough();

const productLotsQuerySchema = z.object({
    estadoLote: z.enum(["Agotado", "Por vencer pronto", "En buen estado"]).optional(),
    fechaDesde: z.string().trim().optional(),
    fechaHasta: z.string().trim().optional()
}).passthrough();

module.exports = {
    idParamsSchema,
    inventoryQuerySchema,
    productLotsQuerySchema
};
