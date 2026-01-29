const express = require('express');
const {
    registrarMetodoPago,
    listarMetodoPago,
    obtenerMetodoPago    
} = require('../controllers/payment.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// POST /metodopago - Crear nuevo método de pago
router.post('/', verificarToken, registrarMetodoPago);

// GET /metodopago - Listar todos los métodos de pago
router.get('/', verificarToken, listarMetodoPago);

// GET /metodopago/activos - Obtener métodos de pago activos
router.get('/activos', verificarToken, obtenerMetodoPago);

module.exports = router;