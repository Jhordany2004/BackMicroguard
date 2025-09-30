const express = require('express');
const {
    registrarVenta,      
} = require('../controllers/sales.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/registrar',verificarToken, registrarVenta);

module.exports = router;