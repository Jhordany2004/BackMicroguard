const { Schema, model } = require('mongoose');

const modeloProducto = new Schema({
    nombre: { type: String, required: true },
    codigoBarras: { type: String, required: false }, // código de barras, debe ser único
    imagen: { type: String, required: false}, 
    cantidadmedida: { type: Number, required: false, min: 0 }, // cantidad de medida ejemplo: 500 ml
    stockTotal: { type: Number, required: true, min: 0 }, // stock total disponible (todos los lotes)
    medida: { type: String, requires: false}, // unidad de medida (ej: kg, lt, und)
    perecible: { type: Boolean, require: false },
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true }, 
    Categoria: { type: Schema.Types.ObjectId, ref: 'Categoria', required: true },
    estado: { type: Boolean, default: true }, // activo/inactivo
}, { timestamps: true });

// Índices compuestos para unicidad por tienda
modeloProducto.index({ nombre: 1, codigoBarras: 1, Tienda: 1 }, { unique: true });

module.exports = model('Producto', modeloProducto);