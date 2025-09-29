const { Schema, model } = require('mongoose');

const modeloconfig = new Schema({
    stockminimo: { type: Number, required: true},
    diasporvencer: { type: Number, required: true  },
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },    
}, { timestamps: true });

module.exports = model('Configuracion', modeloconfig);