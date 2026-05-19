const express = require("express");
const {
    registrarUsuario,
    verificarRucDisponible,
    loginUsuario,
    cerrarSesion
} = require("../controllers/user.controller");

const { verificarToken } = require("../middlewares/auth.middleware");
const { validateSchema } = require("../middlewares/validate.middleware");
const {
    registerUserSchema,
    rucQuerySchema,
    loginUserSchema,
    logoutUserSchema
} = require("../validators/user.validator");

const router = express.Router();

router.post("/completarRegistro", validateSchema({ body: registerUserSchema }), registrarUsuario);
router.get("/verificarRucDisponible", validateSchema({ query: rucQuerySchema }), verificarRucDisponible);
router.post("/login", validateSchema({ body: loginUserSchema }), loginUsuario);
router.post("/cerrarSesion", verificarToken, validateSchema({ body: logoutUserSchema }), cerrarSesion);

module.exports = router;
