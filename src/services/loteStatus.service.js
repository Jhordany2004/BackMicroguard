/**
 * Service para calcular el estado de un lote de producto
 * Estados posibles:
 * - ACEPTABLE: Stock disponible, no vencido, no próximo a vencer
 * - BAJO_STOCK: Stock disponible pero por debajo del 20% del inicial
 * - PROXIMO_VENCER: Stock disponible pero vencimiento en próximos 7 días
 * - VENCIDO: Fecha de vencimiento ha pasado
 */

const calcularEstadoLote = (lote, diasAlerta = 7) => {
    try {
        // Obtener el stock actual
        const stockActual = lote.stockActual || 0;
        const stockInicial = lote.stockInicial || 0;
        
        // Obtener fechas
        const fechaVencimiento = lote.fechaVencimiento ? new Date(lote.fechaVencimiento) : null;
        const ahora = new Date();
        
        // Calcular porcentaje de stock
        const porcentajeStock = stockInicial > 0 ? (stockActual / stockInicial) * 100 : 0;
        
        // 1. Verificar si está vencido
        if (fechaVencimiento && ahora > fechaVencimiento) {
            return {
                estado: 'VENCIDO',
                descripcion: 'Producto vencido - no apto para venta',
                color: 'red',
                prioridad: 1, // Más alta prioridad
                fecha_vencimiento: fechaVencimiento,
                dias_restantes: Math.floor((fechaVencimiento - ahora) / (1000 * 60 * 60 * 24))
            };
        }
        
        // 2. Verificar si es próximo a vencer (dentro de X días)
        if (fechaVencimiento) {
            const diasRestantes = Math.floor((fechaVencimiento - ahora) / (1000 * 60 * 60 * 24));
            if (diasRestantes >= 0 && diasRestantes <= diasAlerta) {
                return {
                    estado: 'PROXIMO_VENCER',
                    descripcion: `Producto próximo a vencer en ${diasRestantes} días`,
                    color: 'orange',
                    prioridad: 2,
                    fecha_vencimiento: fechaVencimiento,
                    dias_restantes: diasRestantes
                };
            }
        }
        
        // 3. Verificar bajo stock (20% o menos del stock inicial)
        if (porcentajeStock <= 20 && stockActual > 0) {
            return {
                estado: 'BAJO_STOCK',
                descripcion: `Stock bajo - ${stockActual} unidades disponibles (${porcentajeStock.toFixed(2)}%)`,
                color: 'yellow',
                prioridad: 3,
                stock_actual: stockActual,
                porcentaje_stock: porcentajeStock.toFixed(2)
            };
        }
        
        // 4. Stock agotado
        if (stockActual === 0) {
            return {
                estado: 'AGOTADO',
                descripcion: 'Stock agotado',
                color: 'red',
                prioridad: 1,
                stock_actual: 0
            };
        }
        
        // 5. Aceptable (por defecto)
        return {
            estado: 'ACEPTABLE',
            descripcion: `Stock disponible - ${stockActual} unidades (${porcentajeStock.toFixed(2)}%)`,
            color: 'green',
            prioridad: 4,
            stock_actual: stockActual,
            porcentaje_stock: porcentajeStock.toFixed(2),
            fecha_vencimiento: fechaVencimiento
        };
        
    } catch (error) {
        console.error('Error al calcular estado del lote:', error);
        return {
            estado: 'DESCONOCIDO',
            descripcion: 'Error al calcular el estado',
            color: 'gray',
            prioridad: 5,
            error: error.message
        };
    }
};

/**
 * Obtener todos los lotes con sus estados calculados
 * @param {Array} lotes - Array de documentos LoteProducto
 * @param {Number} diasAlerta - Días de alerta para vencimiento
 * @returns {Array} Lotes con estado calculado
 */
const obtenerLotesConEstado = (lotes, diasAlerta = 7) => {
    if (!Array.isArray(lotes)) {
        return [];
    }
    
    return lotes.map(lote => ({
        ...lote.toObject ? lote.toObject() : lote,
        estadoCalculado: calcularEstadoLote(lote, diasAlerta)
    }));
};

/**
 * Obtener resumen de estados para dashboard
 * @param {Array} lotes - Array de lotes
 * @returns {Object} Resumen de estados
 */
const obtenerResumenEstados = (lotes) => {
    const resumen = {
        aceptable: 0,
        bajo_stock: 0,
        proximo_vencer: 0,
        vencido: 0,
        agotado: 0,
        total: lotes.length
    };
    
    lotes.forEach(lote => {
        const estado = calcularEstadoLote(lote);
        const estadoKey = estado.estado.toLowerCase().replace(/_/g, '_');
        if (resumen.hasOwnProperty(estadoKey)) {
            resumen[estadoKey]++;
        }
    });
    
    return resumen;
};

module.exports = {
    calcularEstadoLote,
    obtenerLotesConEstado,
    obtenerResumenEstados
};
