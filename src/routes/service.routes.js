const express = require('express');
const {
    verificarRuc,
    verificarDNI,

} = require('../controllers/service.controller');
const { validateSchema } = require('../middlewares/validate.middleware');
const { rucParamsSchema, dniParamsSchema } = require('../validators/service.validator');

const router = express.Router();

router.get('/ruc/:ruc', validateSchema({ params: rucParamsSchema }), verificarRuc);
router.get('/dni/:dni', validateSchema({ params: dniParamsSchema }), verificarDNI);

module.exports = router;        
