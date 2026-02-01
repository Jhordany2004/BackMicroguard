const nodemailer = require('nodemailer');
const dns = require('node:dns');

dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
    host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
    port: Number(process.env.BREVO_SMTP_PORT) || 587,
    secure: false, // Brevo usa TLS, no SSL
    auth: {
        user: process.env.BREVO_SMTP_USER || "apikey",
        pass: process.env.BREVO_SMTP_PASS, // xsmtpsib-...
    },
    tls: {
        rejectUnauthorized: false,
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