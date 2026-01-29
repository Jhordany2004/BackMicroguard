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

// POST /cliente - Crear nuevo cliente
router.post('/', verificarToken, registrarCliente);

// GET /cliente - Listar todos los clientes
router.get('/', verificarToken, listarCliente);

// GET /cliente/activos - Obtener clientes activos (estado: true)
router.get('/activos', verificarToken, obtenerCliente);

// GET /cliente/buscar?documento=123&nombre=Juan - Buscar por parámetros
router.get('/buscar', verificarToken, obtenerPorDocumentoYNombre);

// GET /cliente/:id - Obtener un cliente por ID
router.get('/:id', verificarToken, obtenerCliente);

// PUT /cliente/:id - Actualizar cliente
router.put('/:id', verificarToken, editarCliente);

// PATCH /cliente/:id/disable - Deshabilitar cliente
router.patch('/:id/disable', verificarToken, deshabilitarCliente);

// PATCH /cliente/:id/enable - Habilitar cliente
router.patch('/:id/enable', verificarToken, habilitarCliente);

module.exports = router;