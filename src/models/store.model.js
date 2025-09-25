const { Schema, model } = require('mongoose');

const modeloStore = new Schema({
    Usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true },
    RUC: { type: String, required: true, unique: true },
    RazonSocial: { type: String, required: true, unique: true},
}, { timestamps: true });

module.exports = model('Tienda', modeloStore);