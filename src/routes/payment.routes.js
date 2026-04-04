const express = require('express');
const {
    registrarMetodoPago,
    listarMetodoPago,
    obtenerMetodoPago    
} = require('../controllers/payment.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verificarToken);

router.post('/', registrarMetodoPago);
router.get('/', listarMetodoPago);
router.get('/activos', obtenerMetodoPago);

module.exports = router;