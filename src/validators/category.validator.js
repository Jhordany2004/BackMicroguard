const { z, idParamsSchema, statusBodySchema, requiredString } = require("./common.validator");

const createCategorySchema = z.object({
    nombre: requiredString("El nombre es obligatorio"),
    descripcion: z.string().optional().nullable()
}).passthrough();

const updateCategorySchema = z.object({
    nombre: z.string().trim().optional(),
    descripcion: z.string().trim().optional()
}).passthrough().refine(
    (data) => Boolean(data.nombre || data.descripcion),
    "Debe enviar nombre o descripcion para actualizar"
);

module.exports = {
    idParamsSchema,
    statusBodySchema,
    createCategorySchema,
    updateCategorySchema
};
