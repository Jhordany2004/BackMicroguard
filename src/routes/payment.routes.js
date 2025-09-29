const express = require('express');
const {
    listarMetodoPago,
    obtenerMetodoPago    
} = require('../controllers/payment.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/listar', verificarToken, listarMetodoPago);
router.post('/obtener', verificarToken, obtenerMetodoPago);

module.exports = router;