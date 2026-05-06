const express = require("express");
const {
    registrarUsuario,
    verificarRucDisponible,
    loginUsuario,
    recuperarContrasena,
    restablecerContrasena,
    cerrarSesion
} = require("../controllers/user.controller");

const { verificarToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/crear", registrarUsuario);
router.post("/completarRegistro", registrarUsuario);
router.get("/verificarRucDisponible", verificarRucDisponible);
router.post("/login", loginUsuario);
router.post("/cerrarSesion", verificarToken, cerrarSesion);
router.post("/recuperar", recuperarContrasena);
router.post("/restablecer", restablecerContrasena);

module.exports = router;
