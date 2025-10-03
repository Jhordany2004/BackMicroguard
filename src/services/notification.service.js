const admin = require('../config/firebase');
const LoteProducto = require('../models/batch.model');
const Producto = require('../models/product.model');
const Configuracion = require('../models/config.model');
const Usuario = require('../models/user.model');

async function notificarLotesCriticos(tiendaId) {
    // 1. Obtener configuración de la tienda
    const config = await Configuracion.findOne({ Tienda: tiendaId });
    if (!config) return;

    // 2. Listar lotes activos
    const lotes = await LoteProducto.find({ estado: true, Tienda: tiendaId }).populate('Producto');

    const hoy = new Date();
    let lotesNotificar = [];

    for (const lote of lotes) {
        // Stock bajo
        if (lote.stockActual <= config.stockMinimo) {
            lotesNotificar.push({
                tipo: 'stock',
                producto: lote.Producto.nombre,
                loteId: lote._id,
                stock: lote.stockActual
            });
        }
        // Próximo a vencer
        if (lote.fechaVencimiento) {
            const diasRestantes = Math.ceil((lote.fechaVencimiento - hoy) / (1000 * 60 * 60 * 24));
            if (diasRestantes <= config.diasAlertaVencimiento) {
                lotesNotificar.push({
                    tipo: 'vencimiento',
                    producto: lote.Producto.nombre,
                    loteId: lote._id,
                    fechaVencimiento: lote.fechaVencimiento
                });
            }
        }
    }

    if (lotesNotificar.length === 0) return;

    // 3. Obtener tokens FCM de los usuarios de la tienda
    const usuarios = await Usuario.find({ Tienda: tiendaId, fcmTokens: { $exists: true, $ne: [] } });
    const tokens = usuarios.flatMap(u => u.fcmTokens).filter(Boolean);

    // 4. Enviar notificaciones
    for (const lote of lotesNotificar) {
        const message = {
            notification: {
                title: lote.tipo === 'stock'
                    ? `Stock bajo: ${lote.producto}`
                    : `Próximo a vencer: ${lote.producto}`,
                body: lote.tipo === 'stock'
                    ? `El stock es ${lote.stock}`
                    : `Vence el ${new Date(lote.fechaVencimiento).toLocaleDateString()}`
            },
            tokens
        };
        await admin.messaging().sendMulticast(message);
    }
}

module.exports = {
    notificarLotesCriticos
};
