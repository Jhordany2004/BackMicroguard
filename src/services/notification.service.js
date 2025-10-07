const admin = require('../config/firebase');
const LoteProducto = require('../models/batch.model');
const Producto = require('../models/product.model');
const Configuracion = require('../models/config.model');
const Usuario = require('../models/user.model');
const Store = require('../models/store.model');

async function notificarLotesCriticos(tiendaId) {
    try {
        // 1. Obtener configuración de la tienda
        const config = await Configuracion.findOne({ Tienda: tiendaId });
        if (!config) {
            return { lotesNotificados: [], tokensEnviados: [] };
        }

        // 2. Buscar productos de la tienda
        const productos = await Producto.find({ Tienda: tiendaId }, '_id');
        const productosIds = productos.map(p => p._id);

        if (productosIds.length === 0) {
            return { lotesNotificados: [], tokensEnviados: [] };
        }

        // 3. Listar lotes activos relacionados a esos productos
        const lotes = await LoteProducto.find({ 
            estado: true, 
            Producto: { $in: productosIds } 
        }).populate('Producto');

        const hoy = new Date();
        let lotesNotificar = [];

        for (const lote of lotes) {
            let notificado = false;
            // Stock bajo
            if (lote.stockActual <= config.stockminimo) {               
                lotesNotificar.push({
                    tipo: 'stock',
                    producto: lote.Producto.nombre,
                    loteId: lote._id,
                    stock: lote.stockActual
                });
            }
            if (lote.fechaVencimiento) {
                const diasRestantes = Math.ceil((lote.fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
                if (diasRestantes <= config.diasAlertaVencimiento && diasRestantes >= 0) {                   
                    lotesNotificar.push({
                        tipo: 'vencimiento',
                        producto: lote.Producto.nombre,
                        loteId: lote._id,
                        fechaVencimiento: lote.fechaVencimiento,
                        diasRestantes
                    });
                }
            }
        }
        

        if (lotesNotificar.length === 0) {
            return { lotesNotificados: [], tokensEnviados: [] };
        }

        // 4. Obtener el usuario dueño de la tienda y sus tokens FCM
        const tienda = await Store.findById(tiendaId);
        if (!tienda) {
            return { lotesNotificados: lotesNotificar, tokensEnviados: [] };
        }

        const usuario = await Usuario.findById(tienda.Usuario);
        const tokens = usuario?.fcmTokens?.filter(Boolean) || [];

        if (tokens.length === 0) {
            return { lotesNotificados: lotesNotificar, tokensEnviados: [] };
        }

        // 5. Enviar notificaciones
        let totalEnviados = 0;
        let totalFallidos = 0;
        const tokensInvalidos = [];

        for (const lote of lotesNotificar) {
            const messagePayload = {
                notification: {
                    title: lote.tipo === 'stock'
                        ? `⚠️ Stock bajo: ${lote.producto}`
                        : `⏰ Próximo a vencer: ${lote.producto}`,
                    body: lote.tipo === 'stock'
                        ? `Solo quedan ${lote.stock} unidades`
                        : `Vence el ${new Date(lote.fechaVencimiento).toLocaleDateString('es-ES')}`
                },
                data: {
                    tipo: lote.tipo,
                    loteId: lote.loteId.toString(),
                    tiendaId: tiendaId.toString()
                },
                tokens: tokens
            };

            try {
                const response = await admin.messaging().sendEachForMulticast(messagePayload);
                
                totalEnviados += response.successCount;
                totalFallidos += response.failureCount;

                // Identificar tokens inválidos
                response.responses.forEach((resp, idx) => {
                    if (!resp.success) {
                        const errorCode = resp.error?.code;
                        
                        if (errorCode === 'messaging/invalid-registration-token' ||
                            errorCode === 'messaging/registration-token-not-registered') {
                            tokensInvalidos.push(tokens[idx]);
                        }
                    }
                });
            } catch (error) {
                totalFallidos += tokens.length;
            }
        }

        // Limpiar tokens inválidos
        if (tokensInvalidos.length > 0) {
            await Usuario.findByIdAndUpdate(
                tienda.Usuario,
                { $pull: { fcmTokens: { $in: tokensInvalidos } } }
            );
        }

        return {
            lotesNotificados: lotesNotificar,
            tokensEnviados: tokens,
            estadisticas: {
                totalEnviados,
                totalFallidos,
                tokensInvalidos: tokensInvalidos.length
            }
        };

    } catch (error) {
        throw error;
    }
}

module.exports = {
    notificarLotesCriticos
};