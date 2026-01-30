const mongoose = require('mongoose');
require('dotenv').config();  

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });
        console.log('📊 Conectado exitosamente a MongoDB Atlas');
    } catch (error) {
        console.error('Error al conectar a MongoDB Atlas:', error);
    }
}  

module.exports = { connectDB };