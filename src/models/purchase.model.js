const { Schema, model } = require('mongoose');

const detalleCompraSchema = new Schema({
    lote: { type: Schema.Types.ObjectId, ref: 'LoteProducto', required: true },
    cantidadComprada: { type: Number, required: true },
    precioUnitario: { type: Number, required: true },
    precioTotal: { type: Number, required: true }, // cantidadComprada * precioUnitario
    
    // Denormalización mínima para Flutter (sin populate)
    producto: {
        productoId: { type: Schema.Types.ObjectId, ref: 'Producto' },
        nombre: { type: String },
        medida: { type: String },
        codigoBarras: { type: String }
    }
});

const modeloCompra = new Schema({
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    Proveedor: { type: Schema.Types.ObjectId, ref: 'Proveedor', required: true },
    fechaRegistro: { type: Date, default: Date.now },
    precioTotal: { type: Number, required: true },
    estado: { type: Boolean, default: true },
    detalles: [detalleCompraSchema]
}, { timestamps: true });

// Índices para búsquedas rápidas
modeloCompra.index({ Tienda: 1, fechaRegistro: -1, estado: 1 });
modeloCompra.index({ Tienda: 1, Proveedor: 1, fechaRegistro: -1 });

module.exports = model('Compra', modeloCompra);