const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

// Cargar credenciales
const serviceAccount = require(path.resolve(process.env.FIREBASE_CREDENTIALS_PATH));

// Inicializar Firebase Admin (solo una vez)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log(' Firebase Admin inicializado correctamente');
}

// Exportar la instancia completa de admin
module.exports = admin;