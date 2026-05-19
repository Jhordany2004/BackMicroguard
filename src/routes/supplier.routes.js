const express = require('express');
const {
    registrarProveedor,
    editarProveedor,
    listarProveedores,
    obtenerProveedores,
    obtenerProveedorPorID,
    cambiarEstadoProveedor,
    obtenerPorDocumentoYRazonSocial,
} = require('../controllers/supplier.controller');

const { verificarToken } = require('../middlewares/auth.middleware');
const { validateSchema } = require('../middlewares/validate.middleware');
const {
    idParamsSchema,
    statusBodySchema,
    createSupplierSchema,
    updateSupplierSchema,
    searchSupplierQuerySchema
} = require('../validators/supplier.validator');

const router = express.Router();

router.use(verificarToken);

router.post('/', validateSchema({ body: createSupplierSchema }), registrarProveedor);
router.get('/', listarProveedores);
router.get('/activos', obtenerProveedores);
router.get('/buscar', validateSchema({ query: searchSupplierQuerySchema }), obtenerPorDocumentoYRazonSocial);
router.get('/:id', validateSchema({ params: idParamsSchema }), obtenerProveedorPorID);
router.put('/:id', validateSchema({ params: idParamsSchema, body: updateSupplierSchema }), editarProveedor);
router.patch('/:id/estado', validateSchema({ params: idParamsSchema, body: statusBodySchema }), cambiarEstadoProveedor);

module.exports = router;
