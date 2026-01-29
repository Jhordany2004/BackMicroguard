const { Schema, model } = require('mongoose');

const modeloOperacion = new Schema({
    razon: { type: String, required: true },
    descripcion: { type: String, required: true },
    cantidad: { type: Number, required: true },    
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    
    // Lote embebido con contexto de producto para mejor performance
    lote: {
        loteId: { type: Schema.Types.ObjectId, ref: 'LoteProducto', required: true },
        producto: {
            productoId: { type: Schema.Types.ObjectId, ref: 'Producto' },
            nombre: { type: String },
            medida: { type: String },
            codigoBarras: { type: String }
        }
    },
    
    estado: { type: Boolean, required: false, default: true },
}, { timestamps: true });

// Índices para búsquedas frecuentes
modeloOperacion.index({ Tienda: 1, createdAt: -1, estado: 1 });
modeloOperacion.index({ Tienda: 1, 'lote.loteId': 1 });

module.exports = model('Operacion', modeloOperacion);