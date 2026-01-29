const express = require('express');
const {
    registrarProveedor,
    editarProveedor,
    listarProveedores,
    obtenerProveedores,
    obtenerProveedorPorID,
    deshabilitarProveedor,
    habilitarProveedor,
    obtenerPorDocumentoYRazonSocial,
} = require('../controllers/supplier.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();


router.post('/', verificarToken, registrarProveedor);
router.get('/', verificarToken, listarProveedores);
router.get('/activos', verificarToken, obtenerProveedores);
router.get('/buscar', verificarToken, obtenerPorDocumentoYRazonSocial);
router.get('/:id', verificarToken, obtenerProveedorPorID);
router.put('/:id', verificarToken, editarProveedor);
router.patch('/:id/disable', verificarToken, deshabilitarProveedor);
router.patch('/:id/enable', verificarToken, habilitarProveedor);

module.exports = router;