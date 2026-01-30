const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    }
});

// Verificar conexión al inicio
transporter.verify((error) => {
    if (error) {
        console.error('❌ Error en configuración de email:', error);
    } else {
        console.log('✉️ Servidor SMTP listo para enviar emails');
    }
});

module.exports = transporter;