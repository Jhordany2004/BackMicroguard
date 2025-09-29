const express = require('express');
const {
    registrarEstadoProducto,
    listarEstadoProducto,    
} = require('../controllers/productStatus.controller');

const router = express.Router();

router.post('/registrar', registrarEstadoProducto);
router.post('/listar', listarEstadoProducto);

module.exports = router;