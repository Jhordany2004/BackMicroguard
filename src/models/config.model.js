const { Schema, model } = require('mongoose');

const modeloconfig = new Schema({
    stockminimo: { type: Number, required: true},
    diasAlertaVencimiento: { type: Number, required: true  },
    monedaDefecto: { type: String, default: 'PEN' }, // Moneda por defecto para la tienda
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },    
}, { timestamps: true });

module.exports = model('Configuracion', modeloconfig);