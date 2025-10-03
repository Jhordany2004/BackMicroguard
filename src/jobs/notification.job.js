const cron = require('node-cron');
const Store = require('../models/store.model');
const { notificarLotesCriticos } = require('../services/notification.service');

// Ejecutar todos los días a las 6:00am hora de Perú (UTC-5)
cron.schedule('0 6 * * *', async () => {
    console.log('Ejecutando notificaciones automáticas de lotes críticos (6am Perú)...');
    try {
        // Obtener todas las tiendas
        const tiendas = await Store.find({});
        for (const tienda of tiendas) {
            await notificarLotesCriticos(tienda._id);
        }
        console.log('Notificaciones enviadas a todas las tiendas.');
    } catch (error) {
        console.error('Error al enviar notificaciones automáticas:', error.message);
    }
}, {
    timezone: 'America/Lima'
});