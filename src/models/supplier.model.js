const { Schema, model } = require('mongoose');

const modeloProveedor = new Schema({
    tipoProveedor: { type: String, required: true, enum: ['Natural', 'Empresa'], },
    documento: { type: String, required: true, trim: true,  match: /^\d{8}(\d{3})?$/ },
    razonSocial: { type: String, required: true, trim: true, uppercase: true },
    telefono: { type: String, required: false },
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    estado: { type: Boolean, required: false, default: true },
}, { timestamps: true });

modeloProveedor.index({ documento: 1, Tienda: 1 }, { unique: true, partialFilterExpression: { estado: true } });
modeloProveedor.index({ razonSocial: 1, Tienda: 1 }, { unique: true, partialFilterExpression: { estado: true } });
modeloProveedor.index({ Tienda: 1, estado: 1, createdAt: -1 });


module.exports = model('Proveedor', modeloProveedor);