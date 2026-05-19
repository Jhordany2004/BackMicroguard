const express = require("express");
const {
    registrarVenta,
    listarVentas,
    buscarVenta,
    cambiarEstadoVenta
} = require("../controllers/sales.controller");
const { verificarToken } = require("../middlewares/auth.middleware");
const { validateSchema } = require("../middlewares/validate.middleware");
const {
    idParamsSchema,
    statusBodySchema,
    createSaleSchema
} = require("../validators/sales.validator");

const router = express.Router();

router.use(verificarToken);

router.post("/", validateSchema({ body: createSaleSchema }), registrarVenta);
router.get("/", listarVentas);
router.get("/:id", validateSchema({ params: idParamsSchema }), buscarVenta);
router.patch("/:id/estado", validateSchema({ params: idParamsSchema, body: statusBodySchema }), cambiarEstadoVenta);

module.exports = router;
