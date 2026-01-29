/**
 * Controller para gestionar el inventario y estados de lotes
 * Utiliza loteStatus.service.js para calcular estados dinámicamente
 */

const LoteProducto = require("../models/batch.model");
const Producto = require("../models/product.model");
const Tienda = require("../models/store.model");
const Configuracion = require("../models/config.model");
const { calcularEstadoLote, obtenerLotesConEstado, obtenerResumenEstados } = require("../services/loteStatus.service");


const obtenerInventarioCompleto = async (req, res) => {
    try {
        const usuario = req.usuarioId;
        
        const tienda = await Tienda.findOne({ Usuario: usuario });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }

        // Obtener configuración de la tienda para diasAlertaVencimiento
        const config = await Configuracion.findOne({ Tienda: tienda._id });
        const diasAlerta = config?.diasAlertaVencimiento || 7;

        // Obtener todos los lotes de los productos de la tienda
        const lotes = await LoteProducto.find()
            .populate({
                path: 'Producto',
                match: { Tienda: tienda._id },
                select: 'nombre codigoBarras stockTotal medida perecible Categoria'
            })
            .populate({
                path: 'Producto',
                populate: {
                    path: 'Categoria',
                    select: 'nombre'
                }
            })
            .lean();

        // Filtrar lotes que pertenezcan a la tienda
        const lotesDelTienda = lotes.filter(lote => lote.Producto !== null);

        // Agregar estado calculado a cada lote
        const lotesConEstado = lotesDelTienda.map(lote => ({
            ...lote,
            estadoCalculado: calcularEstadoLote(lote, diasAlerta)
        }));

        // Obtener resumen de estados
        const resumen = obtenerResumenEstados(lotesDelTienda);

        res.json({
            total_lotes: lotesConEstado.length,
            resumen_estados: resumen,
            lotes: lotesConEstado
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener inventario" });
    }
};


const obtenerAlertasInventario = async (req, res) => {
    try {
        const usuario = req.usuarioId;
        
        const tienda = await Tienda.findOne({ Usuario: usuario });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }

        // Obtener configuración de la tienda para diasAlertaVencimiento
        const config = await Configuracion.findOne({ Tienda: tienda._id });
        const diasAlerta = config?.diasAlertaVencimiento || 7;

        const lotes = await LoteProducto.find()
            .populate({
                path: 'Producto',
                match: { Tienda: tienda._id },
                select: 'nombre codigoBarras stockTotal medida perecible'
            })
            .lean();

        const lotesDelTienda = lotes.filter(lote => lote.Producto !== null);

        // Filtrar solo lotes con alertas
        const lotesConAlertas = lotesDelTienda
            .map(lote => ({
                ...lote,
                estadoCalculado: calcularEstadoLote(lote, diasAlerta)
            }))
            .filter(lote => 
                ['VENCIDO', 'PROXIMO_VENCER', 'BAJO_STOCK', 'AGOTADO'].includes(lote.estadoCalculado.estado)
            )
            .sort((a, b) => a.estadoCalculado.prioridad - b.estadoCalculado.prioridad); // Ordenar por prioridad

        res.json({
            total_alertas: lotesConAlertas.length,
            lotes: lotesConAlertas
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener alertas" });
    }
};


const obtenerLotesProducto = async (req, res) => {
    try {
        const { id } = req.params;
        const usuario = req.usuarioId;

        const tienda = await Tienda.findOne({ Usuario: usuario });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }

        const config = await Configuracion.findOne({ Tienda: tienda._id });
        const diasAlerta = config?.diasAlertaVencimiento || 7;

        const producto = await Producto.findById(id);
        if (!producto || producto.Tienda.toString() !== tienda._id.toString()) {
            return res.status(404).json({ message: "Producto no encontrado en tu tienda" });
        }

        const lotes = await LoteProducto.find({ Producto: id })
            .populate('Producto', 'nombre codigoBarras stockTotal medida perecible')
            .lean();

        if (lotes.length === 0) {
            return res.status(404).json({ message: "No hay lotes para este producto" });
        }

        // Agregar estados calculados
        const lotesConEstado = lotes.map(lote => ({
            ...lote,
            estadoCalculado: calcularEstadoLote(lote, diasAlerta)
        }));

        const resumen = obtenerResumenEstados(lotes);

        res.json({
            producto: producto.nombre,
            total_lotes: lotesConEstado.length,
            resumen_estados: resumen,
            lotes: lotesConEstado
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener lotes del producto" });
    }
};


const obtenerLotesPorEstado = async (req, res) => {
    try {
        const { estado } = req.params;
        const usuario = req.usuarioId;

        const tienda = await Tienda.findOne({ Usuario: usuario });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }

        // Obtener configuración de la tienda para diasAlertaVencimiento
        const config = await Configuracion.findOne({ Tienda: tienda._id });
        const diasAlerta = config?.diasAlertaVencimiento || 7;

        const estadosValidos = ['ACEPTABLE', 'BAJO_STOCK', 'PROXIMO_VENCER', 'VENCIDO', 'AGOTADO'];
        if (!estadosValidos.includes(estado.toUpperCase())) {
            return res.status(400).json({ 
                message: `Estado inválido. Estados válidos: ${estadosValidos.join(', ')}`
            });
        }

        const lotes = await LoteProducto.find()
            .populate({
                path: 'Producto',
                match: { Tienda: tienda._id },
                select: 'nombre codigoBarras stockTotal medida'
            })
            .lean();

        const lotesDelTienda = lotes.filter(lote => lote.Producto !== null);

        // Filtrar por estado calculado
        const lotesFiltrados = lotesDelTienda
            .map(lote => ({
                ...lote,
                estadoCalculado: calcularEstadoLote(lote, diasAlerta)
            }))
            .filter(lote => lote.estadoCalculado.estado === estado.toUpperCase());

        res.json({
            estado: estado.toUpperCase(),
            total: lotesFiltrados.length,
            lotes: lotesFiltrados
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al filtrar lotes" });
    }
};


const obtenerEstadisticasInventario = async (req, res) => {
    try {
        const usuario = req.usuarioId;

        const tienda = await Tienda.findOne({ Usuario: usuario });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }

        // Obtener configuración de la tienda para diasAlertaVencimiento
        const config = await Configuracion.findOne({ Tienda: tienda._id });
        const diasAlerta = config?.diasAlertaVencimiento || 7;

        const lotes = await LoteProducto.find()
            .populate({
                path: 'Producto',
                match: { Tienda: tienda._id }
            })
            .lean();

        const lotesDelTienda = lotes.filter(lote => lote.Producto !== null);

        // Calcular estadísticas
        let totalValorInventario = 0;
        let totalProductos = 0;
        let totalStock = 0;

        lotesDelTienda.forEach(lote => {
            totalValorInventario += (lote.stockActual * lote.precioVenta);
            totalStock += lote.stockActual;
        });

        totalProductos = await Producto.countDocuments({ Tienda: tienda._id });

        const resumen = obtenerResumenEstados(lotesDelTienda);

        res.json({
            resumen_inventario: {
                total_lotes: lotesDelTienda.length,
                total_productos: totalProductos,
                total_stock: totalStock,
                valor_inventario: totalValorInventario.toFixed(2),
                valor_promedio_lote: (totalValorInventario / (lotesDelTienda.length || 1)).toFixed(2)
            },
            distribucion_estados: resumen
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener estadísticas" });
    }
};

module.exports = {
    obtenerInventarioCompleto,
    obtenerAlertasInventario,
    obtenerLotesProducto,
    obtenerLotesPorEstado,
    obtenerEstadisticasInventario
};
