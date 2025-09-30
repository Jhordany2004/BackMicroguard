const { Schema, model } = require('mongoose');

const modeloCategoria = new Schema({
    nombre: { type: String, required: true},
    descripcion: { type: String, required: false},
    estado: { type: Boolean, required: false, default: true },   
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },    
}, { timestamps: true });


modeloCategoria.index({ nombre: 1, Tienda: 1 }, { unique: true });

module.exports = model('Categoria', modeloCategoria);