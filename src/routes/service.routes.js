const express = require('express');
const {
    verificarRuc,
    verificarDNI,

} = require('../controllers/service.controller');

const router = express.Router();

router.get('/ruc/:ruc', verificarRuc);
router.get('/dni/:dni', verificarDNI);

module.exports = router;        
