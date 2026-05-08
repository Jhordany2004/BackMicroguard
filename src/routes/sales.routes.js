const express = require("express");
const {
    registrarVenta,
    listarVentas,
    buscarVenta,
    cambiarEstadoVenta
} = require("../controllers/sales.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(verificarToken);

router.post("/", registrarVenta);
router.get("/", listarVentas);
router.get("/:id", buscarVenta);
router.patch("/:id/estado", cambiarEstadoVenta);

module.exports = router;
