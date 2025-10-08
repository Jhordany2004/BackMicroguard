const EstadoProducto = require('../models/productStatus.model');

const registrarEstadoProducto = async (req, res) => {
    try {
        const { nombre} = req.body;      

        if (!nombre) {
        return res
            .status(400)
            .json({ message: "El campo de nombre es obligatorios" });
        }

        const existe = await EstadoProducto.findOne({ "nombre": nombre });
        if (existe) {
            return res
            .status(409)
            .json({ message: "Ya existe un estado con ese nombre" });
        }          

        const estadoProducto = new EstadoProducto({        
        nombre        
        });
        await estadoProducto.save();

        res.status(201).json({
        message: "Estado producto registrado exitosamente",
        nombre,
        estadoProducto: estadoProducto._id
        });
    } catch (error) {
        const errorMessage = error.message || "Error al registrar el estado producto";
        console.log("Error Back-End:", errorMessage);
        res.status(500).json({ message: errorMessage });
    }
};

const listarEstadoProducto = async (req, res) => {
    try {
        const estadosProducto = await EstadoProducto.find({});
        if (!estadosProducto.length) {
            return res.status(404).json({ message: "No hay estado de productos" });
        }
        res.json(estadosProducto);
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener estados productos" });
    }
};

// Exportación de módulos
module.exports = {
    registrarEstadoProducto,
    listarEstadoProducto
};
