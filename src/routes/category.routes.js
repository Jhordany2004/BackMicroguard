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
const { validateSchema } = require("../middlewares/validate.middleware");
const {
    idParamsSchema,
    statusBodySchema,
    createCategorySchema,
    updateCategorySchema
} = require("../validators/category.validator");

const router = express.Router();

router.use(verificarToken);

router.post("/", validateSchema({ body: createCategorySchema }), registrarCategoria);
router.get("/", listarCategoria);
router.get("/inactivos", obtenerCategoriasInactivas);
router.get("/activos", obtenerCategoria);
router.get("/:id", validateSchema({ params: idParamsSchema }), buscarCategoria);
router.put("/:id", validateSchema({ params: idParamsSchema, body: updateCategorySchema }), editarCategoria);
router.patch("/:id/estado", validateSchema({ params: idParamsSchema, body: statusBodySchema }), cambiarEstadoCategoria);

module.exports = router;
