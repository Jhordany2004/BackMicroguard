const cron = require('node-cron');
const Store = require('../models/store.model');
const { notificarLotesCriticos } = require('../services/notification.service');

/**
 * Procesa tiendas en lotes para evitar sobrecargar el servidor
 */
async function procesarTiendasEnLotes(tiendas, tamañoLote = 5) {
    const resultados = {
        exitosas: 0,
        fallidas: 0,
        totalLotes: 0,
        errores: []
    };

    // Dividir tiendas en lotes
    for (let i = 0; i < tiendas.length; i += tamañoLote) {
        const lote = tiendas.slice(i, i + tamañoLote);

        // Procesar tiendas del lote en paralelo
        const promesas = lote.map(async (tienda) => {
            try {
                const resultado = await notificarLotesCriticos(tienda._id);
                
                const lotesCount = resultado.lotesNotificados?.length || 0;
                
                if (lotesCount > 0) {
                    resultados.totalLotes += lotesCount;
                }
                
                resultados.exitosas++;
                return { success: true, tienda: tienda._id };
            } catch (error) {
                resultados.fallidas++;
                resultados.errores.push({
                    tiendaId: tienda._id,
                    tiendaNombre: tienda.NombreTienda,
                    error: error.message
                });
                return { success: false, tienda: tienda._id, error: error.message };
            }
        });

        await Promise.allSettled(promesas);

        // Pausa entre lotes
        if (i + tamañoLote < tiendas.length) {
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    return resultados;
}

// Ejecutar todos los días a las 6:00 AM hora de Perú (UTC-5)
const iniciarCronNotificaciones = () => {
    cron.schedule('0 6 * * *', async () => {
        const horaInicio = new Date();
        
        console.log(`\n🔔 Notificaciones automáticas iniciadas - ${horaInicio.toLocaleString('es-PE', { timeZone: 'America/Lima' })}`);
        
        try {
            const tiendas = await Store.find({ estado: true }).select('_id NombreTienda Usuario');
            
            if (tiendas.length === 0) {
                console.log('No hay tiendas para procesar\n');
                return;
            }

            const resultados = await procesarTiendasEnLotes(tiendas, 5);

            const duracion = Math.round((new Date() - horaInicio) / 1000);

            console.log(`✅ Completado: ${resultados.exitosas}/${tiendas.length} tiendas | ${resultados.totalLotes} lotes notificados | ${duracion}s`);
            
            if (resultados.fallidas > 0) {
                console.log(`⚠️  ${resultados.fallidas} tiendas con errores`);
            }

        } catch (error) {
            console.error(`❌ Error crítico: ${error.message}`);
        }
        
        console.log(''); // Línea en blanco para separar
    }, {
        timezone: 'America/Lima',
        scheduled: true
    });

    console.log('✅ Cron configurado: Notificaciones diarias a las 6:00 AM (Hora Perú)');
};

module.exports = { iniciarCronNotificaciones };