const express = require("express");
const {
    registrarOperacion,
    listarOperaciones
} = require("../controllers/operation.controller");
const { verificarToken } = require("../middlewares/auth.middleware");
const { validateSchema } = require("../middlewares/validate.middleware");
const { createOperationSchema } = require("../validators/operation.validator");

const router = express.Router();

router.use(verificarToken);

router.post("/", validateSchema({ body: createOperationSchema }), registrarOperacion);
router.get("/", listarOperaciones);

module.exports = router;
