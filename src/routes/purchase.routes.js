const express = require('express');
const {
    registrarCompra,      
} = require('../controllers/purchase.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/registrar',verificarToken, registrarCompra);

module.exports = router;