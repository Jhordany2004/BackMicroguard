const { Schema, model } = require('mongoose');

const modeloMetodoPago = new Schema({
    nombre: { type: String, required: true, unique: true},    
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    estado: { type: Boolean, required: false },
}, { timestamps: true });

module.exports = model('MetodoPago', modeloMetodoPago);