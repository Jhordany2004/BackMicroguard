const Cliente = require("../models/customer.model");
const Tienda = require("../models/store.model");

const registrarCliente = async (req, res) => {
    try {
        const { documento, nombre, apellido } = req.body;

        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
        console.log("Tienda no encontrada para el usuario:", req.usuarioId);
        return res
            .status(404)
            .json({ message: "Tienda no encontrada para el usuario" });
        }

        if (!documento || !nombre || !apellido ) {
        return res
            .status(400)
            .json({ message: "Los campos documento, nombre y apellido son obligatorios" });
        }

        const tiendaId = tienda._id;

        const camposUnicos = [
            { campo: "documento", valor: documento, mensaje: "Ya existe un cliente con este documento" },
            { campo: "nombre", valor: nombre, mensaje: "Ya existe un cliente con este nombre" },
            { campo: "apellido", valor: apellido, mensaje: "Ya existe un cliente con este apellido" }
        ];

        for (const { campo, valor, mensaje } of camposUnicos) {
            if (valor) {
                const existe = await Cliente.findOne({ [campo]: valor, Tienda: tiendaId });
                if (existe) {
                    return res.status(409).json({ message: mensaje });
                }
            }
        }

        nombreCompleto = nombre + " " + apellido;

        const cliente = new Cliente({
        documento,
        nombre,
        apellido,
        telefono: "",
        Tienda: tiendaId,
        });
        await cliente.save();

        res.status(201).json({
        message: "Cliente registrado exitosamente",
        nombreCompleto,
        });
    } catch (error) {
        const errorMessage = error.message || "Error al registrar el Cliente";
        console.log("Error Back-End:", errorMessage);
        res.status(500).json({ message: errorMessage });
    }
};

// Obtener todos los proveedores activos de la tienda del usuario autenticado
const listarCliente = async (req, res) => {
    try {
        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }
        const clienteActivos = await Cliente.find({ Tienda: tienda._id});
        if (!clienteActivos.length) {
            return res.status(404).json({ message: "No hay clientes activos" });
        }
        res.json(clienteActivos);
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener clientes" });
    }
};

// Obtener todos los proveedores activos de la tienda del usuario autenticado
const obtenerCliente = async (req, res) => {
    try {
        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }
        const clienteActivos = await Cliente.find({ Tienda: tienda._id, estado: true });
        if (!clienteActivos.length) {
            return res.status(404).json({ message: "No hay clientes activos o registre uno" });
        }
        res.json(clienteActivos);
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al obtener clientes" });
    }
};

// Deshabilitar proveedor (cambiar estado a false)
const deshabilitarCliente = async (req, res) => {
    try {
        const { id } = req.body;
        const cliente = await Cliente.findById(id);
        if (!cliente) {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }
        if (!cliente.estado) {
            return res.status(400).json({ message: "El cliente ya está deshabilitado" });
        }
        cliente.estado = false;
        await cliente.save();
        res.json({ message: "Cliente deshabilitado", cliente });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al deshabilitar cliente" });
    }
};

// Deshabilitar proveedor (cambiar estado a false)
const habilitarCliente = async (req, res) => {
    try {
        const { id } = req.body;
        const cliente = await Cliente.findById(id);
        if (!cliente) {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }
        if (cliente.estado) {
            return res.status(400).json({ message: "El cliente ya está habilitado" });
        }
        cliente.estado = true;
        await cliente.save();
        res.json({ message: "Cliente habilitado", cliente });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al habilitar cliente" });
    }
};

// Obtener proveedor activo por documento o razón social
const obtenerPorDocumentoYNombre = async (req, res) => {
    try {
        const { documento, nombre } = req.body;
        const tienda = await Tienda.findOne({ Usuario: req.usuarioId });
        if (!tienda) {
            return res.status(404).json({ message: "Tienda no encontrada para el usuario" });
        }
        const filtro = { Tienda: tienda._id, estado: true };
        if (documento) filtro.documento = documento;
        if (nombre) filtro.nombre = nombre;

        const clienteActivos = await Cliente.find(filtro);
        if (!clienteActivos.length) {
            return res.status(404).json({ message: "No hay clientes activos con esos datos" });
        }
        res.json(clienteActivos);
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al buscar cliente" });
    }
};

const editarCliente = async (req, res) => {
    try {        
        const { id, nombre, apellido, telefono } = req.body;

        // Opcional: Validar campos únicos si se modifican
        const clienteExistente = await Cliente.findById(id);
        if (!clienteExistente) {
            return res.status(404).json({ message: "Cliente no encontrado" });
        }

         // Validar razonSocial único si se modifica
        if (nombre && nombre !== clienteExistente.nombre) {
            const existeNom = await Cliente.findOne({ nombre });
            if (existeNom) {
                return res.status(409).json({ message: "Ya existe un cliente con este nombre" });
            }
        }
        // Validar telefono único si se modifica
        if (apellido && apellido !== clienteExistente.apellido) {
            const existeApel = await Cliente.findOne({ apellido });
            if (existeApel) {
                return res.status(409).json({ message: "Ya existe un cliente con este apellido" });
            }
        }
        // Validar telefono único si se modifica
        if (telefono && telefono !== clienteExistente.telefono) {
            const existeTel = await Cliente.findOne({ telefono });
            if (existeTel) {
                return res.status(409).json({ message: "Ya existe un cliente con este telefono" });
            }
        }

        clienteExistente.nombre = nombre ?? clienteExistente.nombre;
        clienteExistente.apellido = apellido ?? clienteExistente.apellido;
        clienteExistente.telefono = telefono ?? clienteExistente.telefono;

        await clienteExistente.save();

        res.json({ message: "Cliente editado exitosamente", cliente: clienteExistente });
    } catch (error) {
        res.status(500).json({ message: error.message || "Error al editar Cliente" });
    }
};

// Exportación de módulos
module.exports = {
    registrarCliente,
    obtenerCliente,
    listarCliente,
    deshabilitarCliente,
    habilitarCliente,
    obtenerPorDocumentoYNombre,
    editarCliente
};
