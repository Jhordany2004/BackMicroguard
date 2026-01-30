const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS,
    },
    tls: {
        rejectUnauthorized: false
    },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
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