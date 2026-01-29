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

router.post('/', verificarToken, registrarCliente);
router.get('/', verificarToken, listarCliente);
router.get('/activos', verificarToken, obtenerCliente);
router.get('/buscar', verificarToken, obtenerPorDocumentoYNombre);
router.get('/:id', verificarToken, obtenerCliente);
router.put('/:id', verificarToken, editarCliente);
router.patch('/:id/disable', verificarToken, deshabilitarCliente);
router.patch('/:id/enable', verificarToken, habilitarCliente);

module.exports = router;