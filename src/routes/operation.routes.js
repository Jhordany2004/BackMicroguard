const express = require("express");
const {
    registrarOperacion,
    listarOperaciones
} = require("../controllers/operation.controller");
const { verificarToken } = require("../middlewares/auth.middleware");

const router = express.Router();

router.use(verificarToken);

router.post("/", registrarOperacion);
router.get("/", listarOperaciones);

module.exports = router;
