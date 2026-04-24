const express = require('express');
const {
    obtenerInventarioProductos,
    obtenerDetalleProducto,
    obtenerEstadoProducto,
    obtenerEstadosDisponibles
} = require('../controllers/inventory.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verificarToken);

router.get('/', obtenerInventarioProductos);
router.get('/producto/:id', obtenerDetalleProducto);
router.get('/estados', obtenerEstadosDisponibles);
router.get('/estados/:id', obtenerEstadoProducto);

module.exports = router;
