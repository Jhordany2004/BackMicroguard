const express = require("express");
const {
    obtenerSugerencias,
    buscarProductos,
    obtenerProductoPorCodigo
} = require("../controllers/product.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

const router = express.Router();
router.use(verificarToken);

router.get("/sugerencias",  obtenerSugerencias);
router.get("/buscar", buscarProductos);
router.get("/codigo/:codigo", obtenerProductoPorCodigo);

module.exports = router;
