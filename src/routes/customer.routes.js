const express = require('express');
const {
    registrarCliente,
    editarCliente,
    listarCliente,
    obtenerCliente,
    cambiarEstadoCliente,
    buscarPorDocumentoYNombre,
} = require('../controllers/customer.controller');

const { verificarToken } = require('../middlewares/auth.middleware');
const { validateSchema } = require('../middlewares/validate.middleware');
const {
    idParamsSchema,
    statusBodySchema,
    createCustomerSchema,
    updateCustomerSchema,
    searchCustomerQuerySchema
} = require('../validators/customer.validator');

const router = express.Router();

router.use(verificarToken);

router.post('/', validateSchema({ body: createCustomerSchema }), registrarCliente);
router.get('/', listarCliente);
router.get('/activos', obtenerCliente);
router.get('/buscar', validateSchema({ query: searchCustomerQuerySchema }), buscarPorDocumentoYNombre);
router.get('/:id', validateSchema({ params: idParamsSchema }), obtenerCliente);
router.put('/:id', validateSchema({ params: idParamsSchema, body: updateCustomerSchema }), editarCliente);
router.patch('/:id/estado', validateSchema({ params: idParamsSchema, body: statusBodySchema }), cambiarEstadoCliente);

module.exports = router;
