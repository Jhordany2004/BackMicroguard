const express = require('express');
const {
    registrarUsuario,
    verificarRuc,
    verificarDNI,
    loginUsuario,
    recuperarContraseña,
    restablecerContraseña,    
    cerrarSesion,
} = require('../controllers/user.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/registro', registrarUsuario);
router.post('/verificarRuc', verificarRuc);
router.post('/verificarDni', verificarDNI);
router.post('/login', loginUsuario);
router.post('/cerrarSesion', verificarToken, cerrarSesion);
router.post('/recuperar', recuperarContraseña);
router.post('/restablecer', restablecerContraseña);

module.exports = router;