const externalLookupService = require("../services/externalLookup.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { success } = require("../utils/handleResponse");

const verificarRuc = asyncHandler(async (req, res) => {
    const data = await externalLookupService.verifyRuc(req.params.ruc);

    return success(res, {
        message: "RUC encontrado",
        data
    });
});

const verificarDNI = asyncHandler(async (req, res) => {
    const data = await externalLookupService.verifyDni(req.params.dni);

    return success(res, {
        message: "Usuario encontrado",
        data
    });
});

module.exports = {
    verificarRuc,
    verificarDNI
};
