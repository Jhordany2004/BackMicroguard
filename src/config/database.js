const mongoose = require('mongoose');
require('dotenv').config();  

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,  
            useUnifiedTopology: true,  
        });
        console.log('> Conectado exitosamente a MongoDB Atlas');
    } catch (error) {
        console.error('Error al conectar a MongoDB Atlas:', error);
    }
}

module.exports = { connectDB };