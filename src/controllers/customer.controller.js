const { query } = require("../config/database");

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";

const formatearCliente = (cliente) => ({
    id: cliente.id,
    documento: cliente.documento,
    nombre: cliente.nombre,
    apellido: cliente.apellido,
    telefono: cliente.telefono || "",
    estado: cliente.estado,
    fechaRegistro: cliente.fecharegistro,
    fechaModificacion: cliente.fechamodificacion
});

const responderError = (res, error, mensaje) => {
    if (error?.code === "23505") {
        return res.status(409).json({
            success: false,
            message: "Ya existe un cliente con esos datos"
        });
    }

    return res.status(500).json({
        success: false,
        message: error.message || mensaje
    });
};

const validarId = (id, res) => {
    const numero = Number(id);

    if (!Number.isInteger(numero) || numero <= 0) {
        res.status(400).json({
            success: false,
            message: "ID de cliente invalido"
        });
        return null;
    }

    return numero;
};

const validarTienda = (req, res) => {
    if (!req.idTienda) {
        res.status(403).json({
            success: false,
            message: "Usuario sin tienda asociada"
        });
        return false;
    }

    return true;
};

const registrarCliente = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const documento = normalizarTexto(req.body.documento);
        const nombre = normalizarTexto(req.body.nombre);
        const apellido = normalizarTexto(req.body.apellido);
        const telefono = normalizarTexto(req.body.telefono);

        if (!documento || !nombre || !apellido) {
            return res.status(400).json({
                success: false,
                message: "Documento, nombre y apellido son obligatorios"
            });
        }

        const result = await query(
            `INSERT INTO clientes (tienda_id, documento, nombre, apellido, telefono)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id, documento, nombre, apellido, telefono, estado, fechaRegistro, fechaModificacion`,
            [req.idTienda, documento, nombre, apellido, telefono || null]
        );

        return res.status(201).json({
            success: true,
            message: "Cliente registrado correctamente",
            data: { cliente: formatearCliente(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al registrar cliente");
    }
};

const listarCliente = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const result = await query(
            `SELECT id, documento, nombre, apellido, telefono, estado, fechaRegistro, fechaModificacion
             FROM clientes
             WHERE tienda_id = $1
             ORDER BY fechaRegistro DESC
             LIMIT 50`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Clientes obtenidos correctamente" : "No hay clientes registrados",
            data: { clientes: result.rows.map(formatearCliente) }
        });
    } catch (error) {
        return responderError(res, error, "Error al listar clientes");
    }
};

const obtenerCliente = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        if (req.params.id) {
            const id = validarId(req.params.id, res);
            if (!id) return;

            const result = await query(
                `SELECT id, documento, nombre, apellido, telefono, estado, fechaRegistro, fechaModificacion
                 FROM clientes
                 WHERE id = $1 AND tienda_id = $2
                 LIMIT 1`,
                [id, req.idTienda]
            );

            if (!result.rows.length) {
                return res.status(404).json({
                    success: false,
                    message: "Cliente no encontrado"
                });
            }

            return res.status(200).json({
                success: true,
                message: "Cliente obtenido correctamente",
                data: { cliente: formatearCliente(result.rows[0]) }
            });
        }

        const result = await query(
            `SELECT id, documento, nombre, apellido, telefono, estado, fechaRegistro, fechaModificacion
             FROM clientes
             WHERE tienda_id = $1 AND estado = TRUE
             ORDER BY nombre ASC, apellido ASC
             LIMIT 50`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Clientes activos obtenidos correctamente" : "No hay clientes activos",
            data: { clientes: result.rows.map(formatearCliente) }
        });
    } catch (error) {
        return responderError(res, error, "Error al obtener clientes");
    }
};

const buscarPorDocumentoYNombre = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const documento = normalizarTexto(req.query.documento);
        const nombre = normalizarTexto(req.query.nombre);

        if (!documento && !nombre) {
            return res.status(400).json({
                success: false,
                message: "Debe enviar documento o nombre para buscar"
            });
        }

        const filtros = ["tienda_id = $1", "estado = TRUE"];
        const valores = [req.idTienda];

        if (documento) {
            valores.push(documento);
            filtros.push(`documento = $${valores.length}`);
        }

        if (nombre) {
            valores.push(`%${nombre}%`);
            filtros.push(`nombre ILIKE $${valores.length}`);
        }

        const result = await query(
            `SELECT id, documento, nombre, apellido, telefono, estado, fechaRegistro, fechaModificacion
             FROM clientes
             WHERE ${filtros.join(" AND ")}
             ORDER BY nombre ASC, apellido ASC
             LIMIT 50`,
            valores
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Clientes encontrados" : "No hay clientes activos con esos datos",
            data: { clientes: result.rows.map(formatearCliente) }
        });
    } catch (error) {
        return responderError(res, error, "Error al buscar cliente");
    }
};

const editarCliente = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const nombre = normalizarTexto(req.body.nombre);
        const apellido = normalizarTexto(req.body.apellido);
        const telefono = normalizarTexto(req.body.telefono);

        if (!nombre && !apellido && !telefono) {
            return res.status(400).json({
                success: false,
                message: "Debe enviar nombre, apellido o telefono para actualizar"
            });
        }

        const actual = await query(
            `SELECT id, nombre, apellido, telefono
             FROM clientes
             WHERE id = $1 AND tienda_id = $2
             LIMIT 1`,
            [id, req.idTienda]
        );

        if (!actual.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Cliente no encontrado"
            });
        }

        const nombreFinal = nombre || actual.rows[0].nombre;
        const apellidoFinal = apellido || actual.rows[0].apellido;
        const telefonoFinal = telefono || actual.rows[0].telefono;

        const result = await query(
            `UPDATE clientes
             SET nombre = $1,
                 apellido = $2,
                 telefono = $3,
                 fechaModificacion = NOW()
             WHERE id = $4 AND tienda_id = $5
             RETURNING id, documento, nombre, apellido, telefono, estado, fechaRegistro, fechaModificacion`,
            [nombreFinal, apellidoFinal, telefonoFinal || null, id, req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: "Cliente actualizado correctamente",
            data: { cliente: formatearCliente(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al editar cliente");
    }
};

const cambiarEstadoCliente = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const { estado } = req.body;

        if (typeof estado !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Debe enviar el campo estado como booleano"
            });
        }

        const actual = await query(
            `SELECT id, estado
             FROM clientes
             WHERE id = $1 AND tienda_id = $2
             LIMIT 1`,
            [id, req.idTienda]
        );

        if (!actual.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Cliente no encontrado"
            });
        }

        if (actual.rows[0].estado === estado) {
            return res.status(400).json({
                success: false,
                message: `El cliente ya esta ${estado ? "habilitado" : "deshabilitado"}`
            });
        }

        const result = await query(
            `UPDATE clientes
             SET estado = $1,
                 fechaModificacion = NOW()
             WHERE id = $2 AND tienda_id = $3
             RETURNING id, documento, nombre, apellido, telefono, estado, fechaRegistro, fechaModificacion`,
            [estado, id, req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: `Cliente ${estado ? "habilitado" : "deshabilitado"} correctamente`,
            data: { cliente: formatearCliente(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al cambiar estado del cliente");
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
