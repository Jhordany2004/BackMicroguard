const express = require('express');
const {
    obtenerInventarioCompleto,
    obtenerAlertasInventario,
    obtenerLotesProducto,
    obtenerLotesPorEstado,
    obtenerEstadisticasInventario
} = require('../controllers/inventory.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();


router.get('/', verificarToken, obtenerInventarioCompleto);
router.get('/alertas', verificarToken, obtenerAlertasInventario);
router.get('/estadisticas', verificarToken, obtenerEstadisticasInventario);
router.get('/estado/:estado', verificarToken, obtenerLotesPorEstado);
router.get('/producto/:id', verificarToken, obtenerLotesProducto);

module.exports = router;
