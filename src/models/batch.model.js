const { Schema, model } = require('mongoose');

const modeloLote = new Schema({
    stockInicial: { type: Number, required: true, min: 0 },
    stockActual: { type: Number, required: true, min: 0 }, 
    precioCompra: { type: Number, required: true },
    precioVenta: { type: Number, required: true },    
    fechaIngreso: { type: Date, required: false },
    fechaVencimiento: { type: Date, required: false }, 
    Producto: { type: Schema.Types.ObjectId, ref: 'Producto', required: true },
    
    estado: { type: Boolean, default: true }, // activo/inactivo del lote
}, { timestamps: true });

// Índice para búsquedas rápidas de lotes por producto
modeloLote.index({ Producto: 1, estado: 1 });
// Índice para alertas de vencimiento
modeloLote.index({ fechaVencimiento: 1 });
// Índice compuesto para búsquedas de lotes activos con stock
modeloLote.index({ Producto: 1, estado: 1, stockActual: 1 });
// Índice para reportes y análisis
modeloLote.index({ estado: 1, fechaVencimiento: 1, createdAt: -1 });


module.exports = model('LoteProducto', modeloLote);