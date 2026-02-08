const { Schema, model } = require('mongoose');
const bcrypt = require('bcryptjs');

function passwordMeetsCriteria(password) {
    if (typeof password !== 'string') return false;
    const pwd = password.trim();
    if (pwd.length < 8) return false;
    if (!/\p{L}/u.test(pwd)) return false;
    if (!/[A-Z]/.test(pwd)) return false; 
    if (!/\d/.test(pwd)) return false;
    if (!/[^\p{L}\d]/u.test(pwd)) return false;
    return true;
}

const modeloUsuario = new Schema({
    Nombres: { type: String, required: true, trim: true, match: /^[A-Za-zÑñÁÉÍÓÚáéíóú\s]+$/ },
    Apellidos: { type: String, required: true, trim: true, match: /^[A-Za-zÑñÁÉÍÓÚáéíóú\s]+$/ },
    Correo: { type: String, required: true, unique: true, match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/ },
    Celular: { type: String, required: true, unique: true, match: /^\d{9}$/ },
    Contrasena: {
        type: String,
        required: true,
        select: false,
        validate: {
            validator: function (v) {
                if (!this.isModified('Contrasena')) return true;
                return passwordMeetsCriteria(v);
            },
            message: 'La contraseña debe tener mínimo 8 caracteres e incluir al menos una letra mayúscula, una letra minúscula, un número y un caracter especial.'
        }
    },
    codigoRecuperacion: { type: String },
    codigoExpiracion: { type: Date },
    estado: { type: Boolean, default: true },
    fcmTokens: [{ type: String }]
}, { timestamps: true });

// Pre-save: hashear la contraseña cuando sea modificada
modeloUsuario.pre('save', async function (next) {
    try {
        if (!this.isModified('Contrasena')) return next();
        const salt = await bcrypt.genSalt(10);
        this.Contrasena = await bcrypt.hash(this.Contrasena, salt);
        return next();
    } catch (err) {
        return next(err);
    }
});

module.exports = model('Usuario', modeloUsuario);