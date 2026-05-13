const express = require("express");
const {
    registrarUsuario,
    verificarRucDisponible,
    loginUsuario,
    cerrarSesion
} = require("../controllers/user.controller");

const { verificarToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/completarRegistro", registrarUsuario);
router.get("/verificarRucDisponible", verificarRucDisponible);
router.post("/login", loginUsuario);
router.post("/cerrarSesion", verificarToken, cerrarSesion);

module.exports = router;
