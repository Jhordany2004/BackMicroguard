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


router.post('/', verificarToken, registrarCategoria);
router.get('/', verificarToken, listarCategoria);
router.get('/activos', verificarToken, obtenerCategoria);
router.get('/:id', verificarToken, obtenerCategoria);
router.put('/:id', verificarToken, editarCategoria);
router.patch('/:id/disable', verificarToken, deshabilitarCategoria);
router.patch('/:id/enable', verificarToken, habilitarCategoria);

module.exports = router;