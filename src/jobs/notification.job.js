const cron = require("node-cron");
const { query } = require("../config/database");
const { notificarLotesCriticos } = require("../services/notification.service");

const procesarTiendasEnLotes = async (tiendas, tamanioLote = 5) => {
    const resultados = {
        exitosas: 0,
        fallidas: 0,
        totalLotes: 0,
        errores: []
    };

    for (let i = 0; i < tiendas.length; i += tamanioLote) {
        const loteTiendas = tiendas.slice(i, i + tamanioLote);

        const promesas = loteTiendas.map(async (tienda) => {
            try {
                const resultado = await notificarLotesCriticos(tienda.id);
                resultados.totalLotes += resultado.lotesNotificados?.length || 0;
                resultados.exitosas++;
            } catch (error) {
                resultados.fallidas++;
                resultados.errores.push({
                    tiendaId: tienda.id,
                    tiendaNombre: tienda.nombre,
                    error: error.message
                });
            }
        });

        await Promise.allSettled(promesas);

        if (i + tamanioLote < tiendas.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }
    }

    return resultados;
};

const obtenerTiendasActivas = async () => {
    const result = await query(
        `SELECT id, nombre
         FROM tiendas
         WHERE estado = TRUE
         ORDER BY id ASC`
    );

    return result.rows;
};

const iniciarCronNotificaciones = () => {
    cron.schedule("0 6 * * *", async () => {
        const inicio = Date.now();

        try {
            const tiendas = await obtenerTiendasActivas();

            if (!tiendas.length) {
                console.log("No hay tiendas activas para notificaciones");
                return;
            }

            const resultados = await procesarTiendasEnLotes(tiendas, 5);
            const duracionSegundos = Math.round((Date.now() - inicio) / 1000);

            console.log(
                `Notificaciones completadas: ${resultados.exitosas}/${tiendas.length} tiendas, ${resultados.totalLotes} lotes, ${duracionSegundos}s`
            );

            if (resultados.fallidas > 0) {
                console.log(`Tiendas con error: ${resultados.fallidas}`);
            }
        } catch (error) {
            console.error(`Error en cron de notificaciones: ${error.message}`);
        }
    }, {
        timezone: "America/Lima",
        scheduled: true
    });

    console.log("Cron configurado: notificaciones diarias a las 6:00 AM");
};

module.exports = { iniciarCronNotificaciones };
