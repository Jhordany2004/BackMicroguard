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

module.exports = model('Venta', modeloVenta);