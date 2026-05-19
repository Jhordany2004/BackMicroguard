const userService = require("../services/user.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { created, success } = require("../utils/handleResponse");

const registrarUsuario = asyncHandler(async (req, res) => {
    const data = await userService.registerUser(req);

    return created(res, {
        message: "Usuario y tienda registrados correctamente",
        data
    });
});

const loginUsuario = asyncHandler(async (req, res) => {
    const data = await userService.loginUser(req);

    return success(res, {
        message: data.requiereRegistro
            ? "Usuario autenticado con Firebase, debe completar registro"
            : "Inicio de sesion exitoso",
        data
    });
});

const cerrarSesion = asyncHandler(async (req, res) => {
    await userService.logoutUser({
        usuarioId: req.usuarioId,
        fcmToken: req.body.fcmToken
    });

    return success(res, {
        message: "Sesion cerrada correctamente"
    });
});

const verificarRucDisponible = asyncHandler(async (req, res) => {
    const data = await userService.verifyAvailableRuc(req.query.ruc);

    return success(res, {
        message: "RUC disponible para registro",
        data
    });
});

module.exports = {
    registrarUsuario,
    loginUsuario,
    cerrarSesion,
    verificarRucDisponible
};
