const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config();

let serviceAccount;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {    
    try {
        serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);       
    } catch (error) {        
        throw error;
    }
} else if (process.env.FIREBASE_CREDENTIALS_PATH) {    
    serviceAccount = require(path.resolve(process.env.FIREBASE_CREDENTIALS_PATH));    
} else {   
    try {
        serviceAccount = require('./firebase-service-account.json');      
    } catch (error) {        
        throw new Error('Debes configurar FIREBASE_SERVICE_ACCOUNT o FIREBASE_CREDENTIALS_PATH');
    }
}

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
    console.log('🔥 Firebase Admin inicializado correctamente');
}

module.exports = admin;