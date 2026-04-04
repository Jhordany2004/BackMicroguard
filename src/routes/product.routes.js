const express = require("express");
const {
    obtenerSugerencias,
    buscarProductos,
    obtenerProductoPorCodigo
} = require("../controllers/product.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/sugerencias", verificarToken, obtenerSugerencias);
router.get("/buscar", verificarToken, buscarProductos);
router.get("/codigo/:codigo", verificarToken, obtenerProductoPorCodigo);

module.exports = router;
