const { Schema, model } = require('mongoose');

const modeloProveedor = new Schema({
    tipoProveedor: { type: String, required: true, enum: ['Natural', 'Empresa'], },
    documento: { type: String, required: true},
    razonSocial: { type: String, required: true},
    telefono: { type: String, required: false },
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    estado: { type: Boolean, required: false, default: true },
}, { timestamps: true });

modeloProveedor.index({ documento: 1, Tienda: 1 }, { unique: true });
modeloProveedor.index({ razonSocial: 1, Tienda: 1 }, { unique: true });
modeloProveedor.index({ Tienda: 1, estado: 1, createdAt: -1 });

module.exports = model('Proveedor', modeloProveedor);