const mongoose = require("mongoose");
const LoteProducto = require("../models/batch.model");
const Producto = require("../models/product.model");
const Tienda = require("../models/store.model");
const { handleError } = require('../utils/handleError');
const { success } = require("../utils/handleResponse");

const obtenerTienda = async (idTienda) => {
    const tienda = await Tienda.findById(idTienda);
    if (!tienda) throw { status: 404, message: "Tienda no encontrada" };
    return tienda;
};

const ESTADOS_INVENTARIO = {
    AGOTADO: 1,
    PROXIMO_A_VENCER: 2,
    STOCK_BAJO: 3,
    EXCEDENTE: 4,
    STOCK_OPTIMO: 5
};

const LABELS_ESTADO = {
    1: "Agotado",
    2: "Próximo a Vencer",
    3: "Stock Bajo",
    4: "Excedente",
    5: "Stock Óptimo"
};
//nuevo endpoints filtro de busqueda por categoria, nombre producto, estado lote.

const obtenerInventarioProductos = async (req, res) => {
    try {
        const tienda = await obtenerTienda(req.idTienda);
        const { idcategoria, nombreProducto, estado, perecible, pagina, limite } = req.query;

        // Paginacion
        const paginaNum = parseInt(pagina) || 1;
        const limiteNum = parseInt(limite) || 10;
        const skip = (paginaNum - 1) * limiteNum;

        // Validar estado
        const estadoNum = estado && estado.trim() !== "" ? parseInt(estado) : null;
        if (estadoNum !== null && (isNaN(estadoNum) || estadoNum < 1 || estadoNum > 5)) {
            return res.status(400).json({ success: false, message: "Estado inválido. Los valores permitidos son del 1 al 5" });
        }

        const hoy = new Date();
        const fechaLimiteVencer = new Date();
        fechaLimiteVencer.setDate(hoy.getDate() + tienda.diasAlertaVencimiento);
        const stockMinimo = tienda.stockminimo;

        // Filtros base
        const matchProducto = { Tienda: tienda._id, estado: true };

        if (idcategoria && idcategoria.trim() !== "") {
            matchProducto.Categoria = new mongoose.Types.ObjectId(idcategoria.trim());
        }
        if (nombreProducto && nombreProducto.trim() !== "") {
            matchProducto.$text = { $search: nombreProducto.trim() };
        }
        if (perecible !== undefined && perecible.trim() !== "") {
            matchProducto.perecible = perecible === "true";
        }

        // Etapas compartidas del pipeline
        const etapasBase = [
            { $match: matchProducto },

            // Lotes activos del producto
            {
                $lookup: {
                    from: "loteproductos",
                    let: { productoId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$Producto", "$$productoId"] },
                                        { $eq: ["$estado", true] }
                                    ]
                                }
                            }
                        },
                        {
                            $project: {
                                stockActual: 1,
                                fechaVencimiento: 1
                            }
                        }
                    ],
                    as: "lotes"
                }
            },

            // Nombre de la categoria
            {
                $lookup: {
                    from: "categorias",
                    localField: "Categoria",
                    foreignField: "_id",
                    as: "categoriaInfo"
                }
            },

            // Calcular valores derivados de los lotes
            {
                $addFields: {
                    _stockCalculado: { $sum: "$lotes.stockActual" },

                    totalLotes: { $size: "$lotes" },

                    proximaFechaVencimiento: {
                        $min: {
                            $filter: {
                                input: "$lotes.fechaVencimiento",
                                as: "f",
                                cond: { $ne: ["$$f", null] }
                            }
                        }
                    },

                    _lotesProximosAVencer: {
                        $size: {
                            $filter: {
                                input: "$lotes",
                                as: "l",
                                cond: {
                                    $and: [
                                        { $ne: ["$$l.fechaVencimiento", null] },
                                        { $lte: ["$$l.fechaVencimiento", fechaLimiteVencer] },
                                        { $gte: ["$$l.fechaVencimiento", hoy] }
                                    ]
                                }
                            }
                        }
                    },

                    categoria: { $arrayElemAt: ["$categoriaInfo", 0] }
                }
            },

            // Calcular estadoInventario
            {
                $addFields: {
                    estadoInventario: {
                        $switch: {
                            branches: [
                                {
                                    case: { $lte: ["$_stockCalculado", 0] },
                                    then: ESTADOS_INVENTARIO.AGOTADO
                                },
                                {
                                    case: { $gt: ["$_lotesProximosAVencer", 0] },
                                    then: ESTADOS_INVENTARIO.PROXIMO_A_VENCER
                                },
                                {
                                    case: { $lte: ["$_stockCalculado", stockMinimo] },
                                    then: ESTADOS_INVENTARIO.STOCK_BAJO
                                },
                                {
                                    case: { $gt: ["$_stockCalculado", stockMinimo * 2] },
                                    then: ESTADOS_INVENTARIO.EXCEDENTE
                                }
                            ],
                            default: ESTADOS_INVENTARIO.STOCK_OPTIMO
                        }
                    }
                }
            },

            // Filtrar por estadoInventario si viene en el query
            ...(estadoNum !== null ? [{ $match: { estadoInventario: estadoNum } }] : []),
        ];

        const projectFinal = {
            $project: {
                nombre: 1,
                imagen: 1,
                cantidadmedida: 1,
                medida: 1,
                stockTotal: "$_stockCalculado",
                totalLotes: 1,
                proximaFechaVencimiento: 1,
                estadoInventario: 1,
                categoria: {
                    _id: "$categoria._id",
                    nombre: "$categoria.nombre"
                }
            }
        };

        const pipeline = [
            ...etapasBase,
            {
                $facet: {
                    // Total real para calcular páginas
                    total: [{ $count: "count" }],

                    // Productos paginados y ordenados
                    productos: [
                        { $sort: { estadoInventario: 1, createdAt: -1 } },
                        { $skip: skip },
                        { $limit: limiteNum },
                        projectFinal
                    ]
                }
            }
        ];

        const [resultado] = await Producto.aggregate(pipeline);

        const totalProductos = resultado.total[0]?.count || 0;

        res.status(200).json({
            success: true,
            message: "Productos encontrados",
            data: resultado.productos,
            pagination: {
                total: totalProductos,
                pagina: paginaNum,
                limite: limiteNum,
                totalPaginas: Math.ceil(totalProductos / limiteNum)
            }
        });

    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || "Error al filtrar productos" });
    }
};

const obtenerDetalleProducto = async (req, res) => {
    try {
        const tienda = await obtenerTienda(req.idTienda);
        const { id } = req.params;

        // Filtros de lotes
        const { estadoLote, fechaDesde, fechaHasta } = req.query;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: "ID de producto inválido" });
        }

        const hoy = new Date();
        const fechaLimiteVencer = new Date();
        fechaLimiteVencer.setDate(hoy.getDate() + tienda.diasAlertaVencimiento);

        // Filtro de lotes según query params
        const filtroPorFecha = [];
        if (fechaDesde && fechaDesde.trim() !== "") {
            filtroPorFecha.push({ $gte: ["$$l.fechaVencimiento", new Date(fechaDesde)] });
        }
        if (fechaHasta && fechaHasta.trim() !== "") {
            filtroPorFecha.push({ $lte: ["$$l.fechaVencimiento", new Date(fechaHasta)] });
        }

        const pipeline = [
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(id),
                    Tienda: tienda._id,
                    estado: true
                }
            },

            // Categoria
            {
                $lookup: {
                    from: "categorias",
                    localField: "Categoria",
                    foreignField: "_id",
                    as: "categoriaInfo"
                }
            },

            // Todos los lotes activos
            {
                $lookup: {
                    from: "loteproductos",
                    let: { productoId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$Producto", "$$productoId"] },
                                        { $eq: ["$estado", true] }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "lotesActivos"
                }
            },

            // Lotes filtrados para la lista (con filtros de estado y fecha)
            {
                $lookup: {
                    from: "loteproductos",
                    let: { productoId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$Producto", "$$productoId"] },
                                        { $eq: ["$estado", true] },
                                        // Filtro de fecha si viene
                                        ...(filtroPorFecha.length > 0 ? filtroPorFecha.map(f => f) : []),
                                    ]
                                }
                            }
                        },
                        { $sort: { createdAt: 1 } }
                    ],
                    as: "lotesFiltrados"
                }
            },

            // Calcular resumen del producto desde lotesActivos
            {
                $addFields: {
                    stockTotal: { $sum: "$lotesActivos.stockActual" },

                    totalLotes: { $size: "$lotesActivos" },

                    lotesProximosAVencer: {
                        $size: {
                            $filter: {
                                input: "$lotesActivos",
                                as: "l",
                                cond: {
                                    $and: [
                                        { $ne: ["$$l.fechaVencimiento", null] },
                                        { $lte: ["$$l.fechaVencimiento", fechaLimiteVencer] },
                                        { $gte: ["$$l.fechaVencimiento", hoy] }
                                    ]
                                }
                            }
                        }
                    },

                    categoria: { $arrayElemAt: ["$categoriaInfo", 0] },

                    // Agregar numero de lote a cada lote filtrado
                    lotesFiltrados: {
                        $map: {
                            input: "$lotesFiltrados",
                            as: "lote",
                            in: {
                                _id: "$$lote._id",
                                numeroLote: {
                                    $concat: [
                                        "Lote #",
                                        {
                                            $toString: {
                                                $add: [
                                                    { $indexOfArray: ["$lotesActivos._id", "$$lote._id"] },
                                                    1
                                                ]
                                            }
                                        }
                                    ]
                                },
                                stockInicial: "$$lote.stockInicial",
                                stockActual: "$$lote.stockActual",
                                precioCompra: "$$lote.precioCompra",
                                fechaIngreso: "$$lote.fechaIngreso",
                                fechaVencimiento: "$$lote.fechaVencimiento",
                                estadoLote: {
                                    $switch: {
                                        branches: [
                                            {
                                                case: { $lte: ["$$lote.stockActual", 0] },
                                                then: "Agotado"
                                            },
                                            {
                                                case: {
                                                    $and: [
                                                        { $ne: ["$$lote.fechaVencimiento", null] },
                                                        { $lte: ["$$lote.fechaVencimiento", fechaLimiteVencer] },
                                                        { $gte: ["$$lote.fechaVencimiento", hoy] }
                                                    ]
                                                },
                                                then: "Por vencer pronto"
                                            }
                                        ],
                                        default: "En buen estado"
                                    }
                                }
                            }
                        }
                    }
                }
            },

            // Filtrar lotes por estadoLote si viene en query
            ...(estadoLote && estadoLote.trim() !== "" ? [
                {
                    $addFields: {
                        lotesFiltrados: {
                            $filter: {
                                input: "$lotesFiltrados",
                                as: "l",
                                cond: { $eq: ["$$l.estadoLote", estadoLote] }
                            }
                        }
                    }
                }
            ] : []),

            {
                $project: {
                    // Info principal del producto
                    nombre: 1,
                    imagen: 1,
                    cantidadmedida: 1,
                    medida: 1,
                    precioVenta: 1,
                    codigoBarras: 1,
                    codigoInterno: 1,
                    perecible: 1,

                    // Resumen calculado
                    stockTotal: 1,
                    totalLotes: 1,
                    lotesProximosAVencer: 1,

                    // Categoria
                    categoria: {
                        _id: "$categoria._id",
                        nombre: "$categoria.nombre"
                    },

                    // Lista de lotes
                    lotes: "$lotesFiltrados"
                }
            }
        ];

        const [producto] = await Producto.aggregate(pipeline);

        if (!producto) {
            return res.status(404).json({ success: false, message: "Producto no encontrado" });
        }

        res.status(200).json({
            success: true,
            message: "Producto encontrado",
            data: producto
        });

    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || "Error al obtener detalle del producto" });
    }
};

// =====================================================
// 1. ESTADOS DISPONIBLES DEL LISTADO (todos los productos de la tienda)
// =====================================================
const obtenerEstadosDisponibles = async (req, res) => {
    try {
        const tienda = await obtenerTienda(req.idTienda);

        const hoy = new Date();
        const fechaLimiteVencer = new Date();
        fechaLimiteVencer.setDate(hoy.getDate() + tienda.diasAlertaVencimiento);
        const stockMinimo = tienda.stockminimo;

        const pipeline = [
            { $match: { Tienda: tienda._id, estado: true } },

            {
                $lookup: {
                    from: "loteproductos",
                    let: { productoId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ["$Producto", "$$productoId"] },
                                        { $eq: ["$estado", true] }
                                    ]
                                }
                            }
                        },
                        { $project: { stockActual: 1, fechaVencimiento: 1 } }
                    ],
                    as: "lotes"
                }
            },

            {
                $addFields: {
                    _stockCalculado: { $sum: "$lotes.stockActual" },
                    _lotesProximosAVencer: {
                        $size: {
                            $filter: {
                                input: "$lotes",
                                as: "l",
                                cond: {
                                    $and: [
                                        { $ne: ["$$l.fechaVencimiento", null] },
                                        { $lte: ["$$l.fechaVencimiento", fechaLimiteVencer] },
                                        { $gte: ["$$l.fechaVencimiento", hoy] }
                                    ]
                                }
                            }
                        }
                    }
                }
            },

            {
                $addFields: {
                    estadoInventario: {
                        $switch: {
                            branches: [
                                {
                                    case: { $lte: ["$_stockCalculado", 0] },
                                    then: ESTADOS_INVENTARIO.AGOTADO
                                },
                                {
                                    case: { $gt: ["$_lotesProximosAVencer", 0] },
                                    then: ESTADOS_INVENTARIO.PROXIMO_A_VENCER
                                },
                                {
                                    case: { $lte: ["$_stockCalculado", stockMinimo] },
                                    then: ESTADOS_INVENTARIO.STOCK_BAJO
                                },
                                {
                                    case: { $gt: ["$_stockCalculado", stockMinimo * 2] },
                                    then: ESTADOS_INVENTARIO.EXCEDENTE
                                }
                            ],
                            default: ESTADOS_INVENTARIO.STOCK_OPTIMO
                        }
                    }
                }
            },

            { $group: { _id: "$estadoInventario" } }
        ];

        const resultado = await Producto.aggregate(pipeline);

        const estados = resultado
            .map(r => r._id)
            .sort((a, b) => a - b)
            .map(estado => ({
                valor: estado,
                label: LABELS_ESTADO[estado]
            }));

        res.status(200).json({
            success: true,
            message: "Estados disponibles",
            data: estados
        });

    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || "Error al obtener estados disponibles" });
    }
};

// =====================================================
// 2. ESTADO ACTUAL DE UN PRODUCTO ESPECÍFICO
// =====================================================
const obtenerEstadoProducto = async (req, res) => {
    try {
        const tienda = await obtenerTienda(req.idTienda);
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "ID de producto inválido" });
        }

        const hoy = new Date();
        const fechaLimiteVencer = new Date();
        fechaLimiteVencer.setDate(hoy.getDate() + tienda.diasAlertaVencimiento);

        const pipeline = [
            {
                $match: {
                    Producto: new mongoose.Types.ObjectId(id),
                    estado: true
                }
            },

            {
                $addFields: {
                    estadoLote: {
                        $switch: {
                            branches: [
                                {
                                    case: { $lte: ["$stockActual", 0] },
                                    then: "Agotado"
                                },
                                {
                                    case: {
                                        $and: [
                                            { $ne: ["$fechaVencimiento", null] },
                                            { $lte: ["$fechaVencimiento", fechaLimiteVencer] },
                                            { $gte: ["$fechaVencimiento", hoy] }
                                        ]
                                    },
                                    then: "Por vencer pronto"
                                }
                            ],
                            default: "En buen estado"
                        }
                    }
                }
            },

            {
                $group: {
                    _id: "$estadoLote"
                }
            },

            {
                $addFields: {
                    valor: {
                        $switch: {
                            branches: [
                                { case: { $eq: ["$_id", "Agotado"] },          then: 1 },
                                { case: { $eq: ["$_id", "Por vencer pronto"] }, then: 2 },
                                { case: { $eq: ["$_id", "En buen estado"] },    then: 3 }
                            ],
                            default: 0
                        }
                    }
                }
            },

            { $sort: { valor: 1 } },

            {
                $project: {
                    _id: 0,
                    valor: 1,
                    label: "$_id"
                }
            }
        ];

        const estados = await LoteProducto.aggregate(pipeline);

        if (!estados.length) {
            return res.status(404).json({ success: false, message: "No se encontraron lotes para este producto" });
        }

        res.status(200).json({
            success: true,
            message: "Estados del producto",
            data: estados
        });

    } catch (error) {
        const status = error.status || 500;
        res.status(status).json({ message: error.message || "Error al obtener estados del producto" });
    }
};

module.exports = {
    obtenerInventarioProductos,
    obtenerDetalleProducto,
    obtenerEstadoProducto,
    obtenerEstadosDisponibles
};
