const express = require('express');
const {
    obtenerInventarioProductos,
    obtenerDetalleProducto,
    obtenerEstadoProducto,
    obtenerEstadosDisponibles
} = require('../controllers/inventory.controller');

const { verificarToken } = require('../middlewares/auth.middleware');
const { validateSchema } = require('../middlewares/validate.middleware');
const {
    idParamsSchema,
    inventoryQuerySchema,
    productLotsQuerySchema
} = require('../validators/inventory.validator');

const router = express.Router();

router.use(verificarToken);

router.get('/', validateSchema({ query: inventoryQuerySchema }), obtenerInventarioProductos);
router.get('/producto/:id', validateSchema({ params: idParamsSchema, query: productLotsQuerySchema }), obtenerDetalleProducto);
router.get('/estados', obtenerEstadosDisponibles);
router.get('/estados/:id', validateSchema({ params: idParamsSchema }), obtenerEstadoProducto);

module.exports = router;
