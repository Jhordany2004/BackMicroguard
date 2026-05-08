const express = require('express');
const {
    registrarMetodoPago,
    listarMetodoPago,
    obtenerMetodoPago,
    buscarMetodoPago,
    editarMetodoPago,
    cambiarEstadoMetodoPago
} = require('../controllers/payment.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verificarToken);

router.post('/', registrarMetodoPago);
router.get('/', listarMetodoPago);
router.get('/activos', obtenerMetodoPago);
router.get('/:id', buscarMetodoPago);
router.put('/:id', editarMetodoPago);
router.patch('/:id/estado', cambiarEstadoMetodoPago);

module.exports = router;
