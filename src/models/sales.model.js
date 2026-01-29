const { Schema, model } = require('mongoose');

const detalleVentaSchema = new Schema({
    lote: { type: Schema.Types.ObjectId, ref: 'LoteProducto', required: true },
    cantidad: { type: Number, required: true },
    precioUnitario: { type: Number, required: true },    
});

const modeloVenta = new Schema({
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    Cliente: { type: Schema.Types.ObjectId, ref: 'Cliente', required: true },
    MetodoPago: { type: Schema.Types.ObjectId, ref: 'MetodoPago', required: true },
    fechaRegistro: { type: Date, default: Date.now },
    precioTotal: { type: Number, required: true },
    comprobante: { type: String, required: false },
    estado: { type: Boolean, default: true },
    detalles: [detalleVentaSchema]
}, { timestamps: true });

// Índices para búsquedas rápidas
modeloVenta.index({ Tienda: 1, fechaRegistro: -1, estado: 1 });
modeloVenta.index({ Tienda: 1, Cliente: 1, fechaRegistro: -1 });
modeloVenta.index({ Cliente: 1, Tienda: 1 });

module.exports = model('Venta', modeloVenta);