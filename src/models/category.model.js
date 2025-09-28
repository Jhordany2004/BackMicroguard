const { Schema, model } = require('mongoose');

const modeloCategoria = new Schema({
    nombre: { type: String, required: true, unique: true},
    descripcion: { type: String, required: false, unique: true},
    estado: { type: Boolean, required: false, default: true },   
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },    
}, { timestamps: true });

module.exports = model('Categoria', modeloCategoria);