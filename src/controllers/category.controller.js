const Categoria = require("../models/category.model");
const Tienda = require("../models/store.model");
const { handleError } = require('../utils/handleError');
const { success } = require('../utils/handleResponse');
const { formatDatePeru } = require("../utils/formatDate");

const registrarCategoria = async (req, res) => {
    try {
        const { nombre, descripcion} = req.body;

        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
        console.log("Tienda no encontrada para el usuario:", req.usuarioId);
        return res
            .status(404)
            .json({ message: "Tienda no encontrada para el usuario" });
        }

        if (!nombre) {
        return res
            .status(400)
            .json({ message: "El campo de nombre es obligatorios" });
        }

        const tiendaId = tienda._id;

        const existe = await Categoria.findOne({ "nombre": nombre, Tienda: tiendaId });
        if (existe) {
            return res
            .status(409)
            .json({ message: "Ya existe un categoria con ese nombre" });
        }          

        const categoria = new Categoria({        
        nombre,        
        descripcion,
        Tienda: tiendaId,
        });
        await categoria.save();

        res.status(201).json({
        message: "Categoria registrado exitosamente",
        nombre,
        });
    } catch (error) {
        const errorMessage = error.message || "Error al registrar el Categoria";
        console.log("Error Back-End:", errorMessage);
        res.status(500).json({ message: errorMessage });
    }
};


//Listar todas las categorias de la tienda, sin importar su estado (activa o inactiva)
const listarCategoria = async (req, res) => {
    try {
        const tienda = await Tienda.findById(req.idTienda);
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada" });
        }
        const categoriaActivo = await Categoria.find({ Tienda: tienda._id});
        if (!categoriaActivo.length) {
            return res.status(404).json({ message: "No hay categorias activas" });
        }
        const categorias = categoriaActivo.map(categoria => ({
            _id: categoria._id,
            nombre: categoria.nombre,
            descripcion: categoria.descripcion,
            fechaCreacion: formatDatePeru(categoria.createdAt),
            estado: categoria.estado      
        }));
        return success(res, {message: "Categorias activas obtenidas correctamente", data: categorias});
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener categorias" });
    }
};

//Listar solo las categorias activas de la tienda (Por ejemplo para tabla de venta o compras)
const obtenerCategoria = async (req, res) => {
    try {
        const tienda = await Tienda.findById(req.idTienda);
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada" });
        }
        const categoriaActivo = await Categoria.find({ Tienda: tienda._id, estado: true });
        if (!categoriaActivo.length) {
            return res.status(404).json({ message: "No hay categorias activas o registre uno" });
        }
        const categorias = categoriaActivo.map(categoria => ({
            _id: categoria._id,
            nombre: categoria.nombre,
            descripcion: categoria.descripcion,
            fechaCreacion: formatDatePeru(categoria.createdAt),
            estado: categoria.estado
        }));
        return success(res, {message: "Categorias activas obtenidas correctamente", data: categorias});
    } catch (error) {
        return handleError(res, error, { message: "Error al obtener categorias" });
    }
};

//Buscar una categoría específica por ID, con estado activo.
const buscarCategoria = async (req, res) => {
    try {
        const { id } = req.params;

        // Validar que el ID sea válido
        if (!id) {
            return res.status(400).json({ message: "El ID de la categoría es requerido" });
        }

        const tienda = await Tienda.findById(req.idTienda);
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada" });
        }

        // Buscar la categoría específica por ID y que pertenezca a la tienda
        const categoria = await Categoria.findOne({ estado: true, _id: id, Tienda: tienda._id });
        if (!categoria) {
            return res.status(404).json({ message: "Categoría no encontrada" });
        }

        const categoriaFormato = {
            _id: categoria._id,
            nombre: categoria.nombre,
            descripcion: categoria.descripcion,
            fechaCreacion: formatDatePeru(categoria.createdAt),
            estado: categoria.estado    
        };

        return success(res, { message: "Categoría obtenida correctamente", data: categoriaFormato });
    } catch (error) {
        return handleError(res, error, { message: "Error al buscar la categoría" });
    }
};

const editarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, descripcion } = req.body;

        // Validar que exista la tienda
        const tienda = await Tienda.findById(req.idTienda);
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada" });
        }

        // Buscar la categoría por ID y tienda
        const categoriaExistente = await Categoria.findOne({
            _id: id,
            Tienda: tienda._id
        });

        if (!categoriaExistente) {
            return res.status(404).json({
                status: false,
                message: "Categoría no encontrada en esta tienda"
            });
        }

        // Validar nombre único dentro de la misma tienda
        if (nombre && nombre !== categoriaExistente.nombre) {
            const existeNom = await Categoria.findOne({
                nombre,
                Tienda: tienda._id,
                _id: { $ne: id }
            });

            if (existeNom) {
                return res.status(409).json({
                    status: false,
                    message: "Ya existe una categoría con este nombre en esta tienda"
                });
            }
        }

        // Actualizar campos
        categoriaExistente.nombre = nombre ?? categoriaExistente.nombre;
        categoriaExistente.descripcion = descripcion ?? categoriaExistente.descripcion;

        await categoriaExistente.save();

        // Formato de respuesta
        const categoriaEditada = {
            _id: categoriaExistente._id,
            nombre: categoriaExistente.nombre,
            descripcion: categoriaExistente.descripcion,
            estado: categoriaExistente.estado,
            fechaCreacion: formatDatePeru(categoriaExistente.createdAt)
        };

        return success(res, {
            message: "Categoría editada exitosamente",
            data: categoriaEditada
        });

    } catch (error) {
        return handleError(res, error, {
            message: "Error al editar la categoría"
        });
    }
};


const deshabilitarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const categoria = await Categoria.findById(id);
        if (!categoria) {
            return res.status(404).json({ message: "Categoria no encontrado" });
        }
        if (!categoria.estado) {
            return res.status(400).json({ message: "El categoria ya está deshabilitada" });
        }
        categoria.estado = false;
        await categoria.save();

        const categoriaDeshabilitada = {
            _id: categoria._id,
            nombre: categoria.nombre,
            descripcion: categoria.descripcion,
            fechaCreacion: formatDatePeru(categoria.createdAt),
            estado: categoria.estado   
        };

        return success(res,{ message: "Categoria deshabilitada", data: categoriaDeshabilitada });
    } catch (error) {
        return handleError(res, error, { message: "Error al deshabilitar categoria" });
    }
};

const habilitarCategoria = async (req, res) => {
    try {
        const { id } = req.params;
        const categoria = await Categoria.findById(id);
        if (!categoria) {
            return res.status(404).json({ message: "Categoria no encontrado" });
        }
        if (categoria.estado) {
            return res.status(400).json({ message: "El categoria ya está habilitada" });
        }
        categoria.estado = true;
        await categoria.save();

        const categoriaHabilitada = {
            _id: categoria._id,
            nombre: categoria.nombre,
            descripcion: categoria.descripcion,
            fechaCreacion: formatDatePeru(categoria.createdAt),
            estado: categoria.estado   
        };
        
        return success(res, { message: "Categoria habilitada", data: categoriaHabilitada });
    } catch (error) {
        return handleError(res, error, { message: "Error al habilitar categoria" });
    }
};

module.exports = {
    registrarCategoria,
    obtenerCategoria,
    buscarCategoria,
    listarCategoria,
    editarCategoria,
    deshabilitarCategoria,
    habilitarCategoria
};