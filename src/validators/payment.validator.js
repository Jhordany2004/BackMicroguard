const { z, idParamsSchema, statusBodySchema, requiredString } = require("./common.validator");

const paymentBodySchema = z.object({
    nombre: requiredString("El nombre es obligatorio")
}).passthrough();

module.exports = {
    idParamsSchema,
    statusBodySchema,
    paymentBodySchema
};
