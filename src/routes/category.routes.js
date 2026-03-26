const express = require('express');
const {
    registrarCategoria,
    obtenerCategoria,
    obtenerCategoriasInactivas,
    listarCategoria,
    editarCategoria,
    deshabilitarCategoria,
    habilitarCategoria,  
    buscarCategoria
} = require('../controllers/category.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.use(verificarToken);

router.post('/', registrarCategoria);
router.get('/',  listarCategoria);
router.get('/inactivos',  obtenerCategoriasInactivas);
router.get('/activos',  obtenerCategoria);
router.get('/:id',  buscarCategoria);
router.put('/:id',  editarCategoria);
router.patch('/:id/disable' ,  deshabilitarCategoria);
router.patch('/:id/enable',  habilitarCategoria);

module.exports = router;