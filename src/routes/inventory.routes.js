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

router.use(verificarToken);


router.get('/', obtenerInventarioCompleto);
router.get('/alertas', obtenerAlertasInventario);
router.get('/estadisticas', obtenerEstadisticasInventario);
router.get('/estado/:estado', obtenerLotesPorEstado);
router.get('/producto/:id', obtenerLotesProducto);

module.exports = router;
