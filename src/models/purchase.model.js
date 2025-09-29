const { Schema, model } = require('mongoose');

const compraSchema = new Schema({
    usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    proveedor: { type: Schema.Types.ObjectId, ref: 'Proveedor', required: true },
    fechaRegistro: { type: Date, default: Date.now },
    precioTotal: { type: Number, required: true },
    estado: { type: Boolean, default: true },
    lotes: [{ type: Schema.Types.ObjectId, ref: 'LoteProducto', required: true }]
}, { timestamps: true });

module.exports = model('Compra', compraSchema);