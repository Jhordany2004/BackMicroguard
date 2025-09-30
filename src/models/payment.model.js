const { Schema, model } = require('mongoose');

const modeloMetodoPago = new Schema({
    nombre: { type: String, required: true},    
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    estado: { type: Boolean, required: false },
}, { timestamps: true });


modeloMetodoPago.index({ nombre: 1, Tienda: 1 }, { unique: true });


module.exports = model('MetodoPago', modeloMetodoPago);