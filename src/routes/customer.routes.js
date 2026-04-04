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

router.use(verificarToken);

router.post('/', registrarCliente);
router.get('/', listarCliente);
router.get('/activos', obtenerCliente);
router.get('/buscar', obtenerPorDocumentoYNombre);
router.get('/:id', obtenerCliente);
router.put('/:id', editarCliente);
router.patch('/:id/disable', deshabilitarCliente);
router.patch('/:id/enable', habilitarCliente);

module.exports = router;