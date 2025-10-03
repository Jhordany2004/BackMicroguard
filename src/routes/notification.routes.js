const express = require('express');
const { enviarNotificaciones } = require('../controllers/notification.controller');
const { verificarToken } = require('../middlewares/auth.middleware');

const router = express.Router();

// Endpoint para enviar notificaciones push
router.post('/enviar', verificarToken, enviarNotificaciones);

module.exports = router;