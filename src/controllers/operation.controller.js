const operationService = require("../services/operation.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { created, success } = require("../utils/handleResponse");
const { requireUserContext, requireStore } = require("../utils/validators");

const registrarOperacion = asyncHandler(async (req, res) => {
    const context = requireUserContext(req);
    const data = await operationService.createOperation({
        ...context,
        body: req.body
    });

    return created(res, {
        message: "Operacion registrada correctamente",
        data
    });
});

const listarOperaciones = asyncHandler(async (req, res) => {
    const result = await operationService.listOperations(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay operaciones registradas" : "Operaciones obtenidas correctamente",
        data: { operaciones: result.operaciones }
    });
});

module.exports = {
    registrarOperacion,
    listarOperaciones
};
