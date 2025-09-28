const { Schema, model } = require('mongoose');

const modeloCliente = new Schema({
    documento: { type: String, required: true, unique: true },
    nombre: { type: String, required: true, unique: true},
    apellido: { type: String, required: true, unique: true },
    telefono: { type: String, required: false, unique: true },
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    estado: { type: Boolean, required: false, default: true },
}, { timestamps: true });

module.exports = model('Cliente', modeloCliente);