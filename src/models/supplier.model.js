const { Schema, model } = require('mongoose');

const modeloProveedor = new Schema({
    tipoProveedor: { type: String, required: true, enum: ['Natural', 'Empresa'], },
    documento: { type: String, required: true, unique: true },
    razonSocial: { type: String, required: true, unique: true},
    telefono: { type: String, required: false, unique: true },
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    estado: { type: Boolean, required: false, default: true },
}, { timestamps: true });

module.exports = model('Proveedor', modeloProveedor);