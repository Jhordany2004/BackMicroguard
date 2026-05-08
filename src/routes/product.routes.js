const express = require("express");
const {
    registrarProducto,
    listarProductos,
    listarProductosActivos,
    buscarProductoPorId,
    obtenerSugerencias,
    buscarProductos,
    obtenerProductoPorCodigo,
    editarProducto,
    cambiarEstadoProducto
} = require("../controllers/product.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(verificarToken);

router.post("/", registrarProducto);
router.get("/", listarProductos);
router.get("/activos", listarProductosActivos);
router.get("/sugerencias", obtenerSugerencias);
router.get("/buscar", buscarProductos);
router.get("/codigo/:codigo", obtenerProductoPorCodigo);
router.get("/:id", buscarProductoPorId);
router.put("/:id", editarProducto);
router.patch("/:id/estado", cambiarEstadoProducto);

module.exports = router;
