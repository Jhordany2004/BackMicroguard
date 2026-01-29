const Proveedor = require("../models/supplier.model");
const Tienda = require("../models/store.model");

const registrarProveedor = async (req, res) => {
    try {
        const {tipoProveedor, documento, razonSocial, telefono } = req.body;

        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
        console.log("Tienda no encontrada para el usuario:", req.usuarioId);
        return res
            .status(404)
            .json({ message: "Tienda no encontrada para el usuario" });
        }

        if (!tipoProveedor || !documento || !razonSocial ) {
        return res
            .status(400)
            .json({ message: "Los campos Tipo, Documento y Razon Social son obligatorios" });
        }

        if (tipoProveedor !== 'Natural' &&  tipoProveedor !== 'Empresa') {
        return res
            .status(409)
            .json({ message: "Solo se aceptan tipos de proveedor Natural o Empresa" });
        }

        const tiendaId = tienda._id;

        const camposUnicos = [
            { campo: "documento", valor: documento, mensaje: "Ya existe un proveedor con este documento" },
            { campo: "razonSocial", valor: razonSocial, mensaje: "Ya existe un proveedor con esta razon social" },
            { campo: "telefono", valor: telefono, mensaje: "Ya existe un proveedor con este telefono" }
        ];

        for (const { campo, valor, mensaje } of camposUnicos) {
            if (valor) {
                const existe = await Proveedor.findOne({ [campo]: valor, Tienda: tiendaId });
                if (existe) {
                    return res.status(409).json({ message: mensaje });
                }
            }
        }

        const proveedor = new Proveedor({
        tipoProveedor,
        documento,
        razonSocial,
        telefono,
        Tienda: tiendaId,
        });
        await proveedor.save();

        res.status(201).json({
        message: "Proveedor registrado exitosamente",
        razonSocial,
        });
    } catch (error) {
        const errorMessage = error.message || "Error al registrar el proveedor";
        console.log("Error Back-End:", errorMessage);
        res.status(500).json({ message: errorMessage });
    }
};

const listarProveedores = async (req, res) => {
    try {
        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }
        const proveedoresActivos = await Proveedor.find({ Tienda: tienda._id});
        if (!proveedoresActivos.length) {
            return res.status(404).json({ message: "No hay proveedores activos" });
        }
        return res.status(200).json({
            success: true,
            message: "Lista de proveedores obtenidos exitosamente",
            data: proveedoresActivos
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener proveedores" });
    }
};

const obtenerProveedores = async (req, res) => {
    try {
        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }
        const proveedoresActivos = await Proveedor.find({ Tienda: tienda._id , estado: true});
        if (!proveedoresActivos.length) {
            return res.status(404).json({ message: "No hay proveedores activos" });
        }
        return res.status(200).json({
            success: true,
            message: "Proveedores activos obtenidos exitosamente",
            data: proveedoresActivos
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener proveedores" });
    }
};

const obtenerProveedorPorID = async (req, res) => {
    try {
        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        const {id} = req.params;
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }

        const proveedor = await Proveedor.find({ _id: id, Tienda: tienda._id, estado: true });
        if (!proveedor.length) {
            return res.status(404).json({ message: "No hay proveedores activos con ese ID" });
        }
        return res.status(200).json({
            success: true,
            message: "Proveedor encontrado",
            data: proveedor
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener proveedores" });
    }
};

const deshabilitarProveedor = async (req, res) => {
    try {
        const { id } = req.params;
        const proveedor = await Proveedor.findById(id);
        if (!proveedor) {
            return res.status(404).json({ message: "Proveedor no encontrado" });
        }
        if (!proveedor.estado) {
            return res.status(400).json({ message: "El proveedor ya está deshabilitado" });
        }
        proveedor.estado = false;
        await proveedor.save();

        return res.status(200).json({
            success: true,
            message: "Proveedor deshabilitado",
            data: proveedor
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al deshabilitar proveedor" });
    }
};

const habilitarProveedor = async (req, res) => {
    try {
        const { id } = req.params;
        const proveedor = await Proveedor.findById(id);
        if (!proveedor) {
            return res.status(404).json({ message: "Proveedor no encontrado" });
        }
        if (proveedor.estado) {
            return res.status(400).json({ message: "El proveedor ya está habilitado" });
        }
        proveedor.estado = true;
        await proveedor.save();

        return res.status(200).json({
            success: true,
            message: "Proveedor habilitado",
            data: proveedor
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al habilitar proveedor" });
    }
};

const obtenerPorDocumentoYRazonSocial = async (req, res) => {
    try {
        const { documento, razonSocial } = req.query;
        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }
        const filtro = { Tienda: tienda._id, estado: true };
        if (documento) filtro.documento = documento;
        if (razonSocial) filtro.razonSocial = razonSocial;

        const proveedoresActivos = await Proveedor.find(filtro);
        if (!proveedoresActivos.length) {
            return res.status(404).json({ message: "No hay proveedores activos con esos datos" });
        }
        return res.status(200).json({
            success: true,
            message: "Proveedor encontrado",
            data: proveedoresActivos
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al buscar proveedor" });
    }
};

const editarProveedor = async (req, res) => {
    try {        
        const { id } = req.params;
        const { razonSocial, telefono } = req.body;

        // Validar que ID sea válido
        const proveedorExistente = await Proveedor.findById(id);
        if (!proveedorExistente) {
            return res.status(404).json({ message: "Proveedor no encontrado" });
        }

         // Validar razonSocial único si se modifica
        if (razonSocial && razonSocial !== proveedorExistente.razonSocial) {
            const existeRazon = await Proveedor.findOne({ razonSocial });
            if (existeRazon) {
                return res.status(409).json({ message: "Ya existe un proveedor con esta razon social" });
            }
        }
        // Validar telefono único si se modifica
        if (telefono && telefono !== proveedorExistente.telefono) {
            const existeTel = await Proveedor.findOne({ telefono });
            if (existeTel) {
                return res.status(409).json({ message: "Ya existe un proveedor con este telefono" });
            }
        }
        
        proveedorExistente.razonSocial = razonSocial ?? proveedorExistente.razonSocial;
        proveedorExistente.telefono = telefono ?? proveedorExistente.telefono;

        await proveedorExistente.save();

        return res.status(200).json({
            success: true,
            message: "Proveedor editado exitosamente",
            data: proveedorExistente
        });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al editar proveedor" });
    }
};

module.exports = {
    registrarProveedor,
    obtenerProveedores,
    obtenerProveedorPorID,
    listarProveedores,
    deshabilitarProveedor,
    habilitarProveedor,
    obtenerPorDocumentoYRazonSocial,
    editarProveedor
};
