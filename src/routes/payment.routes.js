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
const { validateSchema } = require('../middlewares/validate.middleware');
const {
    idParamsSchema,
    statusBodySchema,
    paymentBodySchema
} = require('../validators/payment.validator');

const router = express.Router();

router.use(verificarToken);

router.post('/', validateSchema({ body: paymentBodySchema }), registrarMetodoPago);
router.get('/', listarMetodoPago);
router.get('/activos', obtenerMetodoPago);
router.get('/:id', validateSchema({ params: idParamsSchema }), buscarMetodoPago);
router.put('/:id', validateSchema({ params: idParamsSchema, body: paymentBodySchema }), editarMetodoPago);
router.patch('/:id/estado', validateSchema({ params: idParamsSchema, body: statusBodySchema }), cambiarEstadoMetodoPago);

module.exports = router;
