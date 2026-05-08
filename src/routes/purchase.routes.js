const express = require("express");
const {
    registrarCompra,
    listarCompras,
    buscarCompra,
    cambiarEstadoCompra
} = require("../controllers/purchase.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(verificarToken);

router.post("/", registrarCompra);
router.get("/", listarCompras);
router.get("/:id", buscarCompra);
router.patch("/:id/estado", cambiarEstadoCompra);

module.exports = router;
