const { Schema, model } = require('mongoose');

const modeloStore = new Schema({
    Usuario: { type: Schema.Types.ObjectId, ref: 'Usuario', required: true, unique: true },
    RUC: { type: String, required: true, unique: true },
    NombreTienda: { type: String, required: true },
    RazonSocial: { type: String, required: true, unique: true},
    estado: { type: Boolean,  required: false, default: true },
    stockminimo: { type: Number, default: 50},
    diasAlertaVencimiento: { type: Number, default: 7 },
    monedaDefecto: { type: String, default: 'PEN' },
    capturaQR: { type: String, required: false }
}, { timestamps: true });

module.exports = model('Tienda', modeloStore);