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

const router = express.Router();

router.use(verificarToken);

router.post('/', registrarProveedor);
router.get('/', listarProveedores);
router.get('/activos', obtenerProveedores);
router.get('/buscar', obtenerPorDocumentoYRazonSocial);
router.get('/:id', obtenerProveedorPorID);
router.put('/:id', editarProveedor);
router.patch('/:id/estado', cambiarEstadoProveedor);

module.exports = router;