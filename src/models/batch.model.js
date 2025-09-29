const { Schema, model } = require('mongoose');

const modeloLote = new Schema({
    stockInicial: { type: Number, required: true, min: 0 },
    stockActual: { type: Number, required: true, min: 0 }, 
    precioCompra: { type: Number, required: true },
    precioVenta: { type: Number, required: true },    
    fechaIngreso: { type: Date, required: false },
    fechaVencimiento: { type: Date, required: false }, 
    Producto: { type: Schema.Types.ObjectId, ref: 'Producto', required: true },   
    EstadoProducto: { type: Schema.Types.ObjectId, ref: 'EstadoProducto', required: true },   
    estado: { type: Boolean, default: true }, // activo/inactivo
}, { timestamps: true });

module.exports = model('LoteProducto', modeloLote);