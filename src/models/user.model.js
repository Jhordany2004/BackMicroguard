const { Schema, model } = require('mongoose');

const modeloUsuario = new Schema({
    Nombres: { type: String, required: true, trim: true, match: /^[A-Za-zÑñÁÉÍÓÚáéíóú\s]+$/ },
    Apellidos: { type: String, required: true, trim: true, match: /^[A-Za-zÑñÁÉÍÓÚáéíóú\s]+$/ },
    Correo: { type: String, required: true, unique: true, match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
    Celular: { type: String, required: true, unique: true, match: /^\d{9,}$/ },
    Contrasena: { type: String, required: true, select: false },
    codigoRecuperacion: { type: String },
    codigoExpiracion: { type: Date },
    estado: { type: Boolean, default: true },
    fcmTokens: [{ type: String }]
}, { timestamps: true });

module.exports = model('Usuario', modeloUsuario);