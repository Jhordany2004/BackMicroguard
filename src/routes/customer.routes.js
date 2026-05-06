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

const router = express.Router();

router.use(verificarToken);

router.post('/', registrarCliente);
router.get('/', listarCliente);
router.get('/activos', obtenerCliente);
router.get('/buscar', buscarPorDocumentoYNombre);
router.get('/:id', obtenerCliente);
router.put('/:id', editarCliente);
router.patch('/:id/estado', cambiarEstadoCliente);

module.exports = router;
