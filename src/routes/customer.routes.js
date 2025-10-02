const express = require('express');
const {
    registrarCliente,
    editarCliente,
    listarCliente,
    obtenerCliente,
    deshabilitarCliente,
    habilitarCliente,
    obtenerPorDocumentoYNombre,
} = require('../controllers/customer.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/registrar', verificarToken, registrarCliente);
router.post('/editar', verificarToken, editarCliente);
router.post('/listar', verificarToken, listarCliente);
router.post('/obtener', verificarToken, obtenerCliente);
router.post('/deshabilitar', verificarToken, deshabilitarCliente);
router.post('/habilitar', verificarToken, habilitarCliente);
router.post('/buscarsegun', verificarToken, obtenerPorDocumentoYNombre);

module.exports = router;