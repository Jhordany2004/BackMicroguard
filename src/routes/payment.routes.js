const express = require('express');
const {
    registrarMetodoPago,
    listarMetodoPago,
    obtenerMetodoPago    
} = require('../controllers/payment.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/', verificarToken, registrarMetodoPago);
router.get('/', verificarToken, listarMetodoPago);
router.get('/activos', verificarToken, obtenerMetodoPago);

module.exports = router;