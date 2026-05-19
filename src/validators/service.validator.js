const { z } = require("./common.validator");

const rucParamsSchema = z.object({
    ruc: z.string().trim().regex(/^\d{11}$/, "RUC debe tener 11 digitos numericos")
});

const dniParamsSchema = z.object({
    dni: z.string().trim().regex(/^\d{8}$/, "DNI debe tener 8 digitos numericos")
});

module.exports = {
    rucParamsSchema,
    dniParamsSchema
};
