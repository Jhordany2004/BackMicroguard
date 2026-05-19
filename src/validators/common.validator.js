const { z } = require("zod");

const positiveId = z.union([
    z.string().trim().regex(/^\d+$/, "Debe ser un ID numerico"),
    z.number().int("Debe ser entero").positive("Debe ser mayor a cero")
]).refine((value) => Number(value) > 0, "Debe ser mayor a cero");

const idParamsSchema = z.object({
    id: positiveId
});

const statusBodySchema = z.object({
    estado: z.boolean({
        error: "El campo estado debe ser booleano"
    })
}).passthrough();

const optionalNumeric = z.union([
    z.string().trim().regex(/^-?\d+(\.\d+)?$/, "Debe ser numerico"),
    z.number()
]).optional();

const optionalPositiveNumeric = z.union([
    z.string().trim().regex(/^\d+(\.\d+)?$/, "Debe ser numerico positivo"),
    z.number().positive("Debe ser mayor a cero")
]).optional();

const requiredString = (message = "Campo obligatorio") => z.string().trim().min(1, message);

module.exports = {
    z,
    positiveId,
    idParamsSchema,
    statusBodySchema,
    optionalNumeric,
    optionalPositiveNumeric,
    requiredString
};
