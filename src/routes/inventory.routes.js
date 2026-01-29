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

// GET /inventario - Obtener inventario completo con estados calculados
router.get('/', verificarToken, obtenerInventarioCompleto);

// GET /inventario/alertas - Obtener lotes con problemas (vencidos, bajo stock, etc)
router.get('/alertas', verificarToken, obtenerAlertasInventario);

// GET /inventario/estadisticas - Estadísticas generales del inventario
router.get('/estadisticas', verificarToken, obtenerEstadisticasInventario);

// GET /inventario/estado/:estado - Filtrar por estado (ACEPTABLE, VENCIDO, etc)
router.get('/estado/:estado', verificarToken, obtenerLotesPorEstado);

// GET /inventario/producto/:id - Obtener lotes de un producto específico
router.get('/producto/:id', verificarToken, obtenerLotesProducto);

module.exports = router;
