const express = require("express");
const {
    registrarCategoria,
    obtenerCategoria,
    obtenerCategoriasInactivas,
    listarCategoria,
    editarCategoria,
    cambiarEstadoCategoria,
    buscarCategoria
} = require("../controllers/category.controller");

const { verificarToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(verificarToken);

router.post("/", registrarCategoria);
router.get("/", listarCategoria);
router.get("/inactivos", obtenerCategoriasInactivas);
router.get("/activos", obtenerCategoria);
router.get("/:id", buscarCategoria);
router.put("/:id", editarCategoria);
router.patch("/:id/estado", cambiarEstadoCategoria);

module.exports = router;
