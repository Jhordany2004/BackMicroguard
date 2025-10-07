const { Schema, model } = require('mongoose');

const modeloCompra = new Schema({
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    Proveedor: { type: Schema.Types.ObjectId, ref: 'Proveedor', required: true },
    fechaRegistro: { type: Date, default: Date.now },
    precioTotal: { type: Number, required: true },
    estado: { type: Boolean, default: true },
    Lotes: [{ type: Schema.Types.ObjectId, ref: 'LoteProducto', required: true }]
}, { timestamps: true });

module.exports = model('Compra', modeloCompra);