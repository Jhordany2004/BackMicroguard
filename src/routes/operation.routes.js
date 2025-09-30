const express = require('express');
const {
    registrarOperacion,
} = require('../controllers/operation.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/registrar', verificarToken, registrarOperacion);

module.exports = router;