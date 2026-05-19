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
const { validateSchema } = require("../middlewares/validate.middleware");
const {
    idParamsSchema,
    statusBodySchema,
    createProductSchema,
    productPayloadSchema,
    suggestionsQuerySchema,
    searchProductsQuerySchema,
    codeParamsSchema
} = require("../validators/product.validator");

const router = express.Router();

router.use(verificarToken);

router.post("/", validateSchema({ body: createProductSchema }), registrarProducto);
router.get("/", listarProductos);
router.get("/activos", listarProductosActivos);
router.get("/sugerencias", validateSchema({ query: suggestionsQuerySchema }), obtenerSugerencias);
router.get("/buscar", validateSchema({ query: searchProductsQuerySchema }), buscarProductos);
router.get("/codigo/:codigo", validateSchema({ params: codeParamsSchema }), obtenerProductoPorCodigo);
router.get("/:id", validateSchema({ params: idParamsSchema }), buscarProductoPorId);
router.put("/:id", validateSchema({ params: idParamsSchema, body: productPayloadSchema }), editarProducto);
router.patch("/:id/estado", validateSchema({ params: idParamsSchema, body: statusBodySchema }), cambiarEstadoProducto);

module.exports = router;
