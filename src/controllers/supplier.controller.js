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

        if (tipoProveedor != 'Natural' && 'Empresa') {
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

// Obtener todos los proveedores activos de la tienda del usuario autenticado
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
        res.json(proveedoresActivos);
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener proveedores" });
    }
};

// Obtener todos los proveedores activos de la tienda del usuario autenticado
const obtenerProveedores = async (req, res) => {
    try {
        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }
        const proveedoresActivos = await Proveedor.find({ Tienda: tienda._id, estado: true });
        if (!proveedoresActivos.length) {
            return res.status(404).json({ message: "No hay proveedores activos" });
        }
        res.json(proveedoresActivos);
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener proveedores" });
    }
};

// Deshabilitar proveedor (cambiar estado a false)
const deshabilitarProveedor = async (req, res) => {
    try {
        const { id } = req.body;
        const proveedor = await Proveedor.findById(id);
        if (!proveedor) {
            return res.status(404).json({ message: "Proveedor no encontrado" });
        }
        if (!proveedor.estado) {
            return res.status(400).json({ message: "El proveedor ya está deshabilitado" });
        }
        proveedor.estado = false;
        await proveedor.save();
        res.json({ message: "Proveedor deshabilitado", proveedor });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al deshabilitar proveedor" });
    }
};

// Deshabilitar proveedor (cambiar estado a false)
const habilitarProveedor = async (req, res) => {
    try {
        const { id } = req.body;
        const proveedor = await Proveedor.findById(id);
        if (!proveedor) {
            return res.status(404).json({ message: "Proveedor no encontrado" });
        }
        if (proveedor.estado) {
            return res.status(400).json({ message: "El proveedor ya está habilitado" });
        }
        proveedor.estado = true;
        await proveedor.save();
        res.json({ message: "Proveedor habilitado", proveedor });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al habilitar proveedor" });
    }
};

// Obtener proveedor activo por documento o razón social
const obtenerPorDocumentoYRazonSocial = async (req, res) => {
    try {
        const { documento, razonSocial } = req.body;
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
        res.json(proveedoresActivos);
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al buscar proveedor" });
    }
};

const editarProveedor = async (req, res) => {
    try {        
        const { id, razonSocial, telefono } = req.body;

        // Opcional: Validar campos únicos si se modifican
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

        res.json({ message: "Proveedor editado exitosamente", proveedor: proveedorExistente });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al editar proveedor" });
    }
};

// Exportación de módulos
module.exports = {
    registrarProveedor,
    obtenerProveedores,
    listarProveedores,
    deshabilitarProveedor,
    habilitarProveedor,
    obtenerPorDocumentoYRazonSocial,
    editarProveedor
};
