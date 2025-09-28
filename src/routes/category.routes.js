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

router.post('/registrar', verificarToken, registrarCategoria);
router.post('/editar', verificarToken, editarCategoria);
router.post('/listar', verificarToken, listarCategoria);
router.post('/obtener', verificarToken, obtenerCategoria);
router.post('/deshabilitar', verificarToken, deshabilitarCategoria);
router.post('/habilitar', verificarToken, habilitarCategoria);

module.exports = router;