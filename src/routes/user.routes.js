const express = require('express');
const {
    registrarUsuario,
    verificarRucDisponible,
    loginUsuario,
    recuperarContraseña,
    restablecerContraseña,    
    cerrarSesion,
} = require('../controllers/user.controller');

const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

router.post('/crear', registrarUsuario);
router.get('/verificarRucDisponible', verificarRucDisponible);
router.post('/login', loginUsuario);
router.post('/cerrarSesion', verificarToken, cerrarSesion);
router.post('/recuperar', recuperarContraseña);
router.post('/restablecer', restablecerContraseña);

module.exports = router;        