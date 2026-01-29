const { Schema, model } = require('mongoose');

const modeloCliente = new Schema({
    documento: { type: String, required: true },
    nombre: { type: String, required: true },
    apellido: { type: String, required: true },
    telefono: { type: String, required: false },
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    estado: { type: Boolean, required: false, default: true },
}, { timestamps: true });

modeloCliente.index({ documento: 1, Tienda: 1 }, { unique: true });
modeloCliente.index({ nombre: 1, apellido: 1, Tienda: 1 }, { unique: true });
modeloCliente.index({ Tienda: 1, estado: 1, createdAt: -1 });

module.exports = model('Cliente', modeloCliente);