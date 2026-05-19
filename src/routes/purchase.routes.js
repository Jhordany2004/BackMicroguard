const express = require("express");
const {
    registrarCompra,
    listarCompras,
    buscarCompra,
    cambiarEstadoCompra
} = require("../controllers/purchase.controller");
const { verificarToken } = require("../middlewares/auth.middleware");
const { validateSchema } = require("../middlewares/validate.middleware");
const {
    idParamsSchema,
    statusBodySchema,
    createPurchaseSchema
} = require("../validators/purchase.validator");

const router = express.Router();

router.use(verificarToken);

router.post("/", validateSchema({ body: createPurchaseSchema }), registrarCompra);
router.get("/", listarCompras);
router.get("/:id", validateSchema({ params: idParamsSchema }), buscarCompra);
router.patch("/:id/estado", validateSchema({ params: idParamsSchema, body: statusBodySchema }), cambiarEstadoCompra);

module.exports = router;
