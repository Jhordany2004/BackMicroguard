const { Schema, model } = require('mongoose');

const modeloEstadoProducto = new Schema({
    nombre: { type: String, required: true, unique: true},    
    estado: { type: Boolean, required: false, default: true },
}, { timestamps: true });

module.exports = model('EstadoProducto', modeloEstadoProducto);