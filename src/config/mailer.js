const nodemailer = require('nodemailer');
const dns = require('node:dns');

dns.setDefaultResultOrder("ipv4first");

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
    family: 4,
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