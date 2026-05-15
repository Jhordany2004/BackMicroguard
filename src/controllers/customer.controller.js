const { query } = require("../config/database");

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";

const formatearCliente = (cliente) => ({
    id: cliente.id,
    tipoCliente: cliente.tipo_cliente,
    tipoDocumento: cliente.tipo_documento,
    documento: cliente.documento,
    nombres: cliente.nombres,
    apellidos: cliente.apellidos,
    nombre: cliente.nombres,
    apellido: cliente.apellidos,
    razonSocial: cliente.razon_social,
    telefono: cliente.telefono || "",
    estado: cliente.estado,
    fechaRegistro: cliente.fecha_registro,
    fechaModificacion: cliente.fecha_modificacion
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

const obtenerDatosCliente = (body, inferirTipo = false) => {
    const razonSocial = normalizarTexto(body.razonSocial ?? body.razon_social);
    const nombres = normalizarTexto(body.nombres ?? body.nombre);
    const apellidos = normalizarTexto(body.apellidos ?? body.apellido);
    const tipoClienteEnviado = normalizarTexto(body.tipoCliente ?? body.tipo_cliente);
    const tipoCliente = tipoClienteEnviado || (inferirTipo ? (razonSocial ? "Empresa" : "Natural") : "");
    const tipoDocumentoEnviado = normalizarTexto(body.tipoDocumento ?? body.tipo_documento).toUpperCase();
    const tipoDocumento = tipoDocumentoEnviado || (inferirTipo && tipoCliente ? (tipoCliente === "Empresa" ? "RUC" : "DNI") : "");

    return {
        tipoCliente,
        tipoDocumento: tipoCliente === "General" ? null : tipoDocumento || null,
        documento: normalizarTexto(body.documento) || null,
        nombres: nombres || null,
        apellidos: apellidos || null,
        razonSocial: razonSocial || null,
        telefono: normalizarTexto(body.telefono) || null
    };
};

const validarDatosCliente = (datos, res) => {
    if (!["General", "Natural", "Empresa"].includes(datos.tipoCliente)) {
        res.status(400).json({
            success: false,
            message: "Tipo de cliente invalido"
        });
        return false;
    }

    if (datos.tipoDocumento && !["DNI", "RUC"].includes(datos.tipoDocumento)) {
        res.status(400).json({
            success: false,
            message: "Tipo de documento invalido"
        });
        return false;
    }

    if (datos.tipoCliente === "Natural" && !datos.nombres) {
        res.status(400).json({
            success: false,
            message: "Los nombres son obligatorios para cliente natural"
        });
        return false;
    }

    if (datos.tipoCliente === "Empresa" && !datos.razonSocial) {
        res.status(400).json({
            success: false,
            message: "La razon social es obligatoria para cliente empresa"
        });
        return false;
    }

    return true;
};

const registrarCliente = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const datos = obtenerDatosCliente(req.body, true);

        if (!validarDatosCliente(datos, res)) return;

        const result = await query(
            `INSERT INTO clientes (
                tienda_id,
                tipo_cliente,
                tipo_documento,
                documento,
                nombres,
                apellidos,
                razon_social,
                telefono
             )
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING id, tipo_cliente, tipo_documento, documento, nombres, apellidos, razon_social, telefono, estado, fecha_registro, fecha_modificacion`,
            [
                req.idTienda,
                datos.tipoCliente,
                datos.tipoDocumento,
                datos.documento,
                datos.nombres,
                datos.apellidos,
                datos.razonSocial,
                datos.telefono
            ]
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
            `SELECT id, tipo_cliente, tipo_documento, documento, nombres, apellidos, razon_social, telefono, estado, fecha_registro, fecha_modificacion
             FROM clientes
             WHERE tienda_id = $1
             ORDER BY fecha_registro DESC
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
                `SELECT id, tipo_cliente, tipo_documento, documento, nombres, apellidos, razon_social, telefono, estado, fecha_registro, fecha_modificacion
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
            `SELECT id, tipo_cliente, tipo_documento, documento, nombres, apellidos, razon_social, telefono, estado, fecha_registro, fecha_modificacion
             FROM clientes
             WHERE tienda_id = $1 AND estado = TRUE
             ORDER BY COALESCE(razon_social, nombres) ASC, apellidos ASC
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
            filtros.push(`(nombres ILIKE $${valores.length} OR apellidos ILIKE $${valores.length} OR razon_social ILIKE $${valores.length})`);
        }

        const result = await query(
            `SELECT id, tipo_cliente, tipo_documento, documento, nombres, apellidos, razon_social, telefono, estado, fecha_registro, fecha_modificacion
             FROM clientes
             WHERE ${filtros.join(" AND ")}
             ORDER BY COALESCE(razon_social, nombres) ASC, apellidos ASC
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

        const datos = obtenerDatosCliente(req.body);

        if (
            !req.body.tipoCliente &&
            !req.body.tipo_cliente &&
            !req.body.tipoDocumento &&
            !req.body.tipo_documento &&
            !req.body.documento &&
            !req.body.nombres &&
            !req.body.nombre &&
            !req.body.apellidos &&
            !req.body.apellido &&
            !req.body.razonSocial &&
            !req.body.razon_social &&
            !req.body.telefono
        ) {
            return res.status(400).json({
                success: false,
                message: "Debe enviar datos para actualizar"
            });
        }

        const actual = await query(
            `SELECT id, tipo_cliente, tipo_documento, documento, nombres, apellidos, razon_social, telefono
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

        const datosFinales = {
            tipoCliente: datos.tipoCliente || actual.rows[0].tipo_cliente,
            tipoDocumento: datos.tipoDocumento || actual.rows[0].tipo_documento,
            documento: datos.documento || actual.rows[0].documento,
            nombres: datos.nombres || actual.rows[0].nombres,
            apellidos: datos.apellidos || actual.rows[0].apellidos,
            razonSocial: datos.razonSocial || actual.rows[0].razon_social,
            telefono: datos.telefono || actual.rows[0].telefono
        };

        if (datosFinales.tipoCliente === "General") {
            datosFinales.tipoDocumento = null;
            datosFinales.documento = null;
            datosFinales.nombres = null;
            datosFinales.apellidos = null;
            datosFinales.razonSocial = null;
        }

        if (!validarDatosCliente(datosFinales, res)) return;

        const result = await query(
            `UPDATE clientes
             SET tipo_cliente = $1,
                 tipo_documento = $2,
                 documento = $3,
                 nombres = $4,
                 apellidos = $5,
                 razon_social = $6,
                 telefono = $7,
                 fecha_modificacion = NOW()
             WHERE id = $8 AND tienda_id = $9
             RETURNING id, tipo_cliente, tipo_documento, documento, nombres, apellidos, razon_social, telefono, estado, fecha_registro, fecha_modificacion`,
            [
                datosFinales.tipoCliente,
                datosFinales.tipoDocumento,
                datosFinales.documento,
                datosFinales.nombres,
                datosFinales.apellidos,
                datosFinales.razonSocial,
                datosFinales.telefono || null,
                id,
                req.idTienda
            ]
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
                 fecha_modificacion = NOW()
             WHERE id = $2 AND tienda_id = $3
             RETURNING id, tipo_cliente, tipo_documento, documento, nombres, apellidos, razon_social, telefono, estado, fecha_registro, fecha_modificacion`,
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
