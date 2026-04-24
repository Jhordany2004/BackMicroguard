const Tienda = require("../models/store.model");
const Producto = require("../models/product.model");
const { handleError } = require("../utils/handleError");

const LIMITE_MINIMO = 1;
const LIMITE_MAXIMO = 10;

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";
const escaparRegex = (valor) => valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const normalizarNumero = (valor, fallback) => {
    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : fallback;
};

const obtenerTienda = async (idTienda) => {
    const tienda = await Tienda.findById(idTienda);
    if (!tienda) throw { status: 404, message: "Tienda no encontrada" };
    return tienda;
};

const obtenerCategoriaNormalizada = (categoria) => {
    if (!categoria) {
        return {
            id: null,
            nombre: null
        };
    }

    if (typeof categoria === "string") {
        return {
            id: categoria,
            nombre: null
        };
    }

    if (categoria._id) {
        return {
            id: categoria._id.toString(),
            nombre: categoria.nombre || null
        };
    }

    if (typeof categoria.toString === "function") {
        return {
            id: categoria.toString(),
            nombre: null
        };
    }

    return {
        id: null,
        nombre: null
    };
};

const construirRespuestaProducto = (producto) => {
    const categoria = obtenerCategoriaNormalizada(producto.Categoria);

    return {
        id: producto._id.toString(),
        codigoBarras: producto.codigoBarras || null,
        nombre: producto.nombre,
        cantidadmedida: producto.cantidadmedida,
        medida: producto.medida,
        perecible: producto.perecible,
        precioVenta: producto.precioVenta,
        categoria: categoria.id ? 
            { id: categoria.id, 
            nombre: categoria.nombre 
            } : null,
    };
};

const construirFiltroBusqueda = ({ tiendaId, query, categoria }) => {
    const filtro = {
        Tienda: tiendaId,
        estado: true
    };

    if (categoria) {
        filtro.Categoria = categoria;
    }

    if (!query) {
        return filtro;
    }

    const queryEscapado = escaparRegex(query);

    filtro.$or = [
        { nombre: { $regex: queryEscapado, $options: "i" } },
        { codigoBarras: { $regex: `^${queryEscapado}`, $options: "i" } }
    ];

    return filtro;
};

const construirFiltroSugerencias = ({ tiendaId, query, categoria }) => {
    const filtro = {
        Tienda: tiendaId,
        estado: true
    };

    if (categoria) {
        filtro.Categoria = categoria;
    }

    if (!query) {
        return filtro;
    }

    const queryEscapado = escaparRegex(query);

    if (query.length < 4) {
        filtro.$or = [
            { nombre: { $regex: `^${queryEscapado}`, $options: "i" } },
            { codigoBarras: { $regex: `^${queryEscapado}` } }
        ];
        return filtro;
    }

    filtro.$text = { $search: query };
    return filtro;
};

const obtenerSugerencias = async (req, res) => {
    try {
        const query = normalizarTexto(req.query.query);
        const categoria = req.query.categoria;
        const limit = Math.min(
            LIMITE_MAXIMO,
            Math.max(LIMITE_MINIMO, normalizarNumero(req.query.limit, 5))
        );

        if (!query || query.length < 2) {
            return res.status(400).json({
                success: false,
                message: "La consulta debe tener al menos 2 caracteres"
            });
        }

        if (categoria && !mongoose.Types.ObjectId.isValid(categoria)) {
            return res.status(400).json({
                success: false,
                message: "Categoría inválida"
            });
        }

        await obtenerTienda(req.idTienda);

        const filtro = construirFiltroSugerencias({
            tiendaId: req.idTienda,
            query,
            categoria
        });

        const projection = query.length >= 4
            ? {
                nombre: 1,
                codigoBarras: 1,
                cantidadmedida: 1,
                medida: 1,
                perecible: 1,                
                Categoria: 1,                
                score: { $meta: "textScore" }
            }
            : null;

        let consulta = Producto.find(filtro);

        if (projection) {
            consulta = consulta.select(projection)
                            .sort({ score: { $meta: "textScore" } });
        } else {
            consulta = consulta.sort({ nombre: 1 });
        }

        const productos = await consulta
            .populate({
                path: "Categoria",
                select: "nombre",
                options: { lean: true }
            })
            .limit(limit)
            .lean();
        
        const data = productos.map(p => {
            const base = construirRespuestaProducto(p);

            return {
                ...base,
                exacto: base.nombre.toLowerCase() === query.toLowerCase()
            };
        });

        return res.status(200).json({
            success: true,
            message: "Productos sugeridos",
            data
        });

    } catch (error) {
        return handleError(res, error, { message: "Error al obtener sugerencias" });
    }
};

const buscarProductos = async (req, res) => {
    try {
        const query = normalizarTexto(req.query.query);
        const categoria = normalizarTexto(req.query.categoria);
        const limit = Math.min(
            LIMITE_MAXIMO,
            Math.max(LIMITE_MINIMO, normalizarNumero(req.query.limit, 5))
        );
        const page = Math.max(1, normalizarNumero(req.query.page, 1));
        const skip = (page - 1) * limit;

        await obtenerTienda(req.idTienda);
        
        const filtro = construirFiltroBusqueda({
            tiendaId: req.idTienda,
            query,
            categoria
        });

        const [productos, total] = await Promise.all([
            Producto.find(filtro)
                .populate("Categoria", "nombre")
                .sort({ nombre: 1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            Producto.countDocuments(filtro)
        ]);

        return res.status(200).json({
            success: true,
            message: "Productos encontrados",
            data: productos.map(construirRespuestaProducto),
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        return handleError(res, error, { message: "Error al buscar productos" });
    }
};

const obtenerProductoPorCodigo = async (req, res) => {
    try {
        const codigo = normalizarTexto(req.params.codigo || req.query.codigo);

        if (!codigo) {
            return res.status(400).json({
                success: false,
                message: "El código de barras es requerido"
            });
        }

        await obtenerTienda(req.idTienda);       

        const producto = await Producto.findOne({
            Tienda: req.idTienda,
            codigoBarras: codigo,
            estado: true
        })
            .populate("Categoria", "nombre")
            .lean();

        if (!producto) {
            return res.status(404).json({
                success: false,
                message: "No existe un producto con ese código de barras"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Producto encontrado",
            data: construirRespuestaProducto(producto)
        });
    } catch (error) {
        return handleError(res, error, { message: "Error al buscar producto por código de barras" });
    }
};

module.exports = {
    obtenerSugerencias,
    buscarProductos,
    obtenerProductoPorCodigo
};
