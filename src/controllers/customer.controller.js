const Cliente = require("../models/customer.model");
const Tienda = require("../models/store.model");
const mongoose = require("mongoose");

const obtenerTienda = async (idTienda) => {
    const tienda = await Tienda.findById(idTienda);
    if (!tienda) throw { status: 404, message: "Tienda no encontrada" };
    return tienda;
};

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";
const escaparRegex = (valor) => valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const formatearCliente = (cliente) => ({
    id: cliente._id,
    documento: cliente.documento,
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    telefono: cliente.telefono || "",
    estado: cliente.estado,
    fechaRegistro: cliente.createdAt
});

const responderError = (res, error, mensaje) => {
    if (error?.status) {
        return res.status(error.status).json({ success: false, message: error.message });
    }

    if (error?.name === "CastError") {
        return res.status(400).json({ success: false, message: "ID de cliente invalido" });
    }

    if (error?.code === 11000) {
        return res.status(409).json({ success: false, message: "Ya existe un cliente con esos datos" });
    }

    return res.status(500).json({ success: false, message: error.message || mensaje });
};

const validarObjectId = (id, res) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: "ID de cliente invalido" });
        return false;
    }

    return true;
};

const registrarCliente = async (req, res) => {
    try {
        const documento = normalizarTexto(req.body.documento);
        const nombre = normalizarTexto(req.body.nombre);
        const apellido = normalizarTexto(req.body.apellido);
        const telefono = normalizarTexto(req.body.telefono);

        const tienda = await obtenerTienda(req.idTienda);

        if (!documento || !nombre || !apellido) {
            return res.status(400).json({
                success: false,
                message: "Los campos documento, nombre y apellido son obligatorios"
            });
        }

        const tiendaId = tienda._id;

        const documentoExistente = await Cliente.findOne({ documento, Tienda: tiendaId });
        if (documentoExistente) {
            return res.status(409).json({
                success: false,
                message: "Ya existe un cliente con este documento"
            });
        }

        const nombreCompletoExistente = await Cliente.findOne({ nombre, apellido, Tienda: tiendaId });
        if (nombreCompletoExistente) {
            return res.status(409).json({
                success: false,
                message: "Ya existe un cliente con este nombre y apellido"
            });
        }

        const cliente = new Cliente({
            documento,
            nombre,
            apellido,
            telefono,
            Tienda: tiendaId
        });
        await cliente.save();

        return res.status(201).json({
            success: true,
            message: "Cliente registrado exitosamente",
            data: {
                cliente: formatearCliente(cliente),
                nombreCompleto: `${nombre} ${apellido}`
            }
        });
    } catch (error) {
        return responderError(res, error, "Error al registrar el Cliente");
    }
};

// Listar todos los clientes sin importar su estado (activo o inactivo)
const listarCliente = async (req, res) => {
    try {
        const tienda = await obtenerTienda(req.idTienda);
        const clientes = await Cliente.find({ Tienda: tienda._id })
            .sort({ createdAt: -1 })
            .limit(50);

        return res.status(200).json({
            success: true,
            message: clientes.length ? "Clientes obtenidos exitosamente" : "No hay clientes registrados",
            data: { clientes: clientes.map(formatearCliente) }
        });
    } catch (error) {
        return responderError(res, error, "Error al obtener clientes");
    }
};

// Listar solo los clientes activos o buscar un cliente por ID si viene req.params.id
const obtenerCliente = async (req, res) => {
    try {
        const tienda = await obtenerTienda(req.idTienda);

        if (req.params.id) {
            if (!validarObjectId(req.params.id, res)) return;

            const cliente = await Cliente.findOne({
                _id: req.params.id,
                Tienda: tienda._id
            });

            if (!cliente) {
                return res.status(404).json({ success: false, message: "Cliente no encontrado" });
            }

            return res.status(200).json({
                success: true,
                message: "Cliente obtenido exitosamente",
                data: { cliente: formatearCliente(cliente) }
            });
        }

        const clientes = await Cliente.find({ Tienda: tienda._id, estado: true })
            .sort({ createdAt: -1 })
            .limit(50);

        return res.status(200).json({
            success: true,
            message: clientes.length ? "Clientes activos obtenidos exitosamente" : "No hay clientes activos o registre uno",
            data: { clientes: clientes.map(formatearCliente) }
        });
    } catch (error) {
        return responderError(res, error, "Error al obtener clientes");
    }
};

const cambiarEstadoCliente = async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;

        if (!validarObjectId(id, res)) return;

        if (typeof estado !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Debe enviar el campo estado como booleano"
            });
        }

        const tienda = await obtenerTienda(req.idTienda);
        const cliente = await Cliente.findOne({ _id: id, Tienda: tienda._id });

        if (!cliente) {
            return res.status(404).json({ success: false, message: "Cliente no encontrado" });
        }

        if (cliente.estado === estado) {
            return res.status(400).json({
                success: false,
                message: `El cliente ya esta ${estado ? "habilitado" : "deshabilitado"}`
            });
        }

        cliente.estado = estado;
        await cliente.save();

        return res.status(200).json({
            success: true,
            message: `Cliente ${estado ? "habilitado" : "deshabilitado"} correctamente`,
            data: { cliente: formatearCliente(cliente) }
        });
    } catch (error) {
        return responderError(res, error, "Error al cambiar estado del cliente");
    }
};

const buscarPorDocumentoYNombre = async (req, res) => {
    try {
        const documento = normalizarTexto(req.query.documento);
        const nombre = normalizarTexto(req.query.nombre);

        if (!documento && !nombre) {
            return res.status(400).json({
                success: false,
                message: "Debe enviar documento o nombre para buscar"
            });
        }

        const tienda = await obtenerTienda(req.idTienda);
        const filtro = { Tienda: tienda._id, estado: true };

        if (documento) filtro.documento = documento;
        if (nombre) filtro.nombre = { $regex: escaparRegex(nombre), $options: "i" };

        const clientes = await Cliente.find(filtro).limit(50);

        return res.status(200).json({
            success: true,
            message: clientes.length ? "Clientes encontrados" : "No hay clientes activos con esos datos",
            data: { clientes: clientes.map(formatearCliente) }
        });
    } catch (error) {
        return responderError(res, error, "Error al buscar cliente");
    }
};

const editarCliente = async (req, res) => {
    try {
        const { id } = req.params;
        if (!validarObjectId(id, res)) return;

        const nombre = normalizarTexto(req.body.nombre);
        const apellido = normalizarTexto(req.body.apellido);
        const telefono = normalizarTexto(req.body.telefono);

        const tienda = await obtenerTienda(req.idTienda);
        const clienteExistente = await Cliente.findOne({ _id: id, Tienda: tienda._id });

        if (!clienteExistente) {
            return res.status(404).json({ success: false, message: "Cliente no encontrado" });
        }

        if (!nombre && !apellido) {
            return res.status(400).json({
                success: false,
                message: "Debe enviar nombre o apellido para actualizar"
            });
        }

        const nombreFinal = nombre || clienteExistente.nombre;
        const apellidoFinal = apellido || clienteExistente.apellido;

        const clienteConMismoNombre = await Cliente.findOne({
            _id: { $ne: id },
            Tienda: tienda._id,
            nombre: nombreFinal,
            apellido: apellidoFinal
        });

        if (clienteConMismoNombre) {
            return res.status(409).json({
                success: false,
                message: "Ya existe un cliente con este nombre y apellido"
            });
        }

        clienteExistente.nombre = nombreFinal;
        clienteExistente.apellido = apellidoFinal;
        clienteExistente.telefono = telefono || clienteExistente.telefono;

        await clienteExistente.save();

        return res.status(200).json({
            success: true,
            message: "Cliente editado exitosamente",
            data: { cliente: formatearCliente(clienteExistente) }
        });
    } catch (error) {
        return responderError(res, error, "Error al editar Cliente");
    }
};

module.exports = {
    registrarCliente,
    obtenerCliente,
    listarCliente,
    cambiarEstadoCliente,
    buscarPorDocumentoYNombre,
    editarCliente
};
