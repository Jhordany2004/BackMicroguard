const Categoria = require("../models/category.model");
const Tienda = require("../models/store.model");

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

const listarCategoria = async (req, res) => {
    try {
        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }
        const categoriaActivo = await Categoria.find({ Tienda: tienda._id});
        if (!categoriaActivo.length) {
            return res.status(404).json({ message: "No hay categorias activas" });
        }
        res.json(categoriaActivo);
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener categorias" });
    }
};

const obtenerCategoria = async (req, res) => {
    try {
        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }
        const categoriaActivo = await Categoria.find({ Tienda: tienda._id, estado: true });
        if (!categoriaActivo.length) {
            return res.status(404).json({ message: "No hay categorias activas o registre uno" });
        }
        res.json(categoriaActivo);
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener categoria" });
    }
};

const editarCategoria = async (req, res) => {
    try {        
        const { id, nombre, descripcion } = req.body;

        // Opcional: Validar campos únicos si se modifican
        const categoriaExistente = await Categoria.findById(id);
        if (!categoriaExistente) {
            return res.status(404).json({ message: "Categoria no encontrado" });
        }

         // Validar razonSocial único si se modifica
        if (nombre && nombre !== categoriaExistente.nombre) {
            const existeNom = await Categoria.findOne({ nombre });
            if (existeNom) {
                return res.status(409).json({ message: "Ya existe un categoria con este nombre" });
            }
        }       

        categoriaExistente.nombre = nombre ?? categoriaExistente.nombre;
        categoriaExistente.descripcion = descripcion ?? categoriaExistente.descripcion;

        await categoriaExistente.save();

        res.json({ message: "Categoria editado exitosamente", Categoria: categoriaExistente });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al editar Categoria" });
    }
};

const deshabilitarCategoria = async (req, res) => {
    try {
        const { id } = req.body;
        const categoria = await Categoria.findById(id);
        if (!categoria) {
            return res.status(404).json({ message: "Categoria no encontrado" });
        }
        if (!categoria.estado) {
            return res.status(400).json({ message: "El categoria ya está deshabilitada" });
        }
        categoria.estado = false;
        await categoria.save();
        res.json({ message: "Categoria deshabilitada", categoria });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al deshabilitar categoria" });
    }
};

const habilitarCategoria = async (req, res) => {
    try {
        const { id } = req.body;
        const categoria = await Categoria.findById(id);
        if (!categoria) {
            return res.status(404).json({ message: "Categoria no encontrado" });
        }
        if (categoria.estado) {
            return res.status(400).json({ message: "El categoria ya está habilitada" });
        }
        categoria.estado = true;
        await categoria.save();
        res.json({ message: "Categoria habilitada", categoria });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al habilitar cliente" });
    }
};

module.exports = {
    registrarCategoria,
    obtenerCategoria,
    listarCategoria,
    editarCategoria,
    deshabilitarCategoria,
    habilitarCategoria
};