const express = require('express');
const {
    registrarProveedor,
    editarProveedor,
    listarProveedores,
    obtenerProveedores,
    deshabilitarProveedor,
    habilitarProveedor,
    obtenerPorDocumentoYRazonSocial,
} = require('../controllers/supplier.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/registrar', verificarToken, registrarProveedor);
router.post('/editar', verificarToken, editarProveedor);
router.post('/listar', verificarToken, listarProveedores);
router.post('/obtener', verificarToken, obtenerProveedores);
router.post('/deshabilitar', verificarToken, deshabilitarProveedor);
router.post('/habilitar', verificarToken, habilitarProveedor);
router.post('/buscarsegun', verificarToken, obtenerPorDocumentoYRazonSocial);

module.exports = router;