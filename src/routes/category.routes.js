const express = require('express');
const {
    registrarCategoria,
    obtenerCategoria,
    listarCategoria,
    editarCategoria,
    deshabilitarCategoria,
    habilitarCategoria  
} = require('../controllers/category.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// POST /categoria - Crear nueva categoría
router.post('/', verificarToken, registrarCategoria);

// GET /categoria - Listar todas las categorías
router.get('/', verificarToken, listarCategoria);

// GET /categoria/activos - Obtener categorías activas (estado: true)
router.get('/activos', verificarToken, obtenerCategoria);

// GET /categoria/:id - Obtener una categoría por ID
router.get('/:id', verificarToken, obtenerCategoria);

// PUT /categoria/:id - Actualizar categoría
router.put('/:id', verificarToken, editarCategoria);

// PATCH /categoria/:id/disable - Deshabilitar categoría
router.patch('/:id/disable', verificarToken, deshabilitarCategoria);

// PATCH /categoria/:id/enable - Habilitar categoría
router.patch('/:id/enable', verificarToken, habilitarCategoria);

module.exports = router;