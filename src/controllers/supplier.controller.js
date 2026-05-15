const { query } = require("../config/database");

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";
const normalizarMayusculas = (valor) => normalizarTexto(valor).toUpperCase();

const formatearProveedor = (proveedor) => ({
    id: proveedor.id,
    tipoProveedor: proveedor.tipo_proveedor,
    tipoDocumento: proveedor.tipo_documento,
    documento: proveedor.documento,
    razonSocial: proveedor.razon_social,
    telefono: proveedor.telefono || "",
    estado: proveedor.estado,
    fechaRegistro: proveedor.fecha_registro,
    fechaModificacion: proveedor.fecha_modificacion
});

const responderError = (res, error, mensaje) => {
    if (error?.code === "23505") {
        return res.status(409).json({
            success: false,
            message: "Documento o razon social ya existe"
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
            message: "ID de proveedor invalido"
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

const validarDocumento = (tipoDocumento, documento) => {
    if (tipoDocumento === "DNI") return /^\d{8}$/.test(documento);
    if (tipoDocumento === "RUC") return /^\d{11}$/.test(documento);
    if (tipoDocumento === "CE") return documento.length >= 8 && documento.length <= 20;
    return false;
};

const registrarProveedor = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const tipoProveedor = normalizarTexto(req.body.tipoProveedor);
        const tipoDocumento = normalizarMayusculas(req.body.tipoDocumento ?? req.body.tipo_documento) || (tipoProveedor === "Natural" ? "DNI" : "RUC");
        const documento = normalizarTexto(req.body.documento);
        const razonSocial = normalizarMayusculas(req.body.razonSocial);
        const telefono = normalizarTexto(req.body.telefono);

        if (!tipoProveedor || !documento || !razonSocial) {
            return res.status(400).json({
                success: false,
                message: "Tipo, documento y razon social son obligatorios"
            });
        }

        if (!["Natural", "Empresa"].includes(tipoProveedor)) {
            return res.status(400).json({
                success: false,
                message: "Tipo de proveedor invalido"
            });
        }

        if (!["DNI", "RUC", "CE"].includes(tipoDocumento)) {
            return res.status(400).json({
                success: false,
                message: "Tipo de documento invalido"
            });
        }

        if (!validarDocumento(tipoDocumento, documento)) {
            return res.status(400).json({
                success: false,
                message: "Documento no valido para el tipo de documento"
            });
        }

        const result = await query(
            `INSERT INTO proveedores (tienda_id, tipo_proveedor, tipo_documento, documento, razon_social, telefono)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, tipo_proveedor, tipo_documento, documento, razon_social, telefono, estado, fecha_registro, fecha_modificacion`,
            [req.idTienda, tipoProveedor, tipoDocumento, documento, razonSocial, telefono || null]
        );

        return res.status(201).json({
            success: true,
            message: "Proveedor registrado correctamente",
            data: { proveedor: formatearProveedor(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al registrar proveedor");
    }
};

const listarProveedores = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const result = await query(
            `SELECT id, tipo_proveedor, tipo_documento, documento, razon_social, telefono, estado, fecha_registro, fecha_modificacion
             FROM proveedores
             WHERE tienda_id = $1
             ORDER BY fecha_registro DESC
             LIMIT 50`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Proveedores obtenidos correctamente" : "No hay proveedores registrados",
            data: { proveedores: result.rows.map(formatearProveedor) }
        });
    } catch (error) {
        return responderError(res, error, "Error al listar proveedores");
    }
};

const obtenerProveedores = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const result = await query(
            `SELECT id, tipo_proveedor, tipo_documento, documento, razon_social, telefono, estado, fecha_registro, fecha_modificacion
             FROM proveedores
             WHERE tienda_id = $1 AND estado = TRUE
             ORDER BY razon_social ASC
             LIMIT 50`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Proveedores activos obtenidos correctamente" : "No hay proveedores activos",
            data: { proveedores: result.rows.map(formatearProveedor) }
        });
    } catch (error) {
        return responderError(res, error, "Error al obtener proveedores activos");
    }
};

const obtenerProveedorPorID = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const result = await query(
            `SELECT id, tipo_proveedor, tipo_documento, documento, razon_social, telefono, estado, fecha_registro, fecha_modificacion
             FROM proveedores
             WHERE id = $1 AND tienda_id = $2
             LIMIT 1`,
            [id, req.idTienda]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Proveedor no encontrado"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Proveedor obtenido correctamente",
            data: { proveedor: formatearProveedor(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al obtener proveedor");
    }
};

const obtenerPorDocumentoYRazonSocial = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const documento = normalizarTexto(req.query.documento);
        const razonSocial = normalizarMayusculas(req.query.razonSocial);

        if (!documento && !razonSocial) {
            return res.status(400).json({
                success: false,
                message: "Debe enviar documento o razon social para buscar"
            });
        }

        const filtros = ["tienda_id = $1", "estado = TRUE"];
        const valores = [req.idTienda];

        if (documento) {
            valores.push(documento);
            filtros.push(`documento = $${valores.length}`);
        }

        if (razonSocial) {
            valores.push(`%${razonSocial}%`);
            filtros.push(`razon_social ILIKE $${valores.length}`);
        }

        const result = await query(
            `SELECT id, tipo_proveedor, tipo_documento, documento, razon_social, telefono, estado, fecha_registro, fecha_modificacion
             FROM proveedores
             WHERE ${filtros.join(" AND ")}
             ORDER BY razon_social ASC
             LIMIT 50`,
            valores
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Proveedores encontrados" : "No hay proveedores activos con esos datos",
            data: { proveedores: result.rows.map(formatearProveedor) }
        });
    } catch (error) {
        return responderError(res, error, "Error al buscar proveedor");
    }
};

const editarProveedor = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const razonSocial = normalizarMayusculas(req.body.razonSocial);
        const telefono = normalizarTexto(req.body.telefono);

        if (!razonSocial && !telefono) {
            return res.status(400).json({
                success: false,
                message: "Debe enviar razon social o telefono para actualizar"
            });
        }

        const actual = await query(
            `SELECT id, razon_social, telefono
             FROM proveedores
             WHERE id = $1 AND tienda_id = $2
             LIMIT 1`,
            [id, req.idTienda]
        );

        if (!actual.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Proveedor no encontrado"
            });
        }

        const razonSocialFinal = razonSocial || actual.rows[0].razon_social;
        const telefonoFinal = telefono || actual.rows[0].telefono;

        const result = await query(
            `UPDATE proveedores
             SET razon_social = $1,
                 telefono = $2,
                 fecha_modificacion = NOW()
             WHERE id = $3 AND tienda_id = $4
             RETURNING id, tipo_proveedor, tipo_documento, documento, razon_social, telefono, estado, fecha_registro, fecha_modificacion`,
            [razonSocialFinal, telefonoFinal || null, id, req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: "Proveedor actualizado correctamente",
            data: { proveedor: formatearProveedor(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al editar proveedor");
    }
};

const cambiarEstadoProveedor = async (req, res) => {
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
             FROM proveedores
             WHERE id = $1 AND tienda_id = $2
             LIMIT 1`,
            [id, req.idTienda]
        );

        if (!actual.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Proveedor no encontrado"
            });
        }

        if (actual.rows[0].estado === estado) {
            return res.status(400).json({
                success: false,
                message: `El proveedor ya esta ${estado ? "habilitado" : "deshabilitado"}`
            });
        }

        const result = await query(
            `UPDATE proveedores
             SET estado = $1,
                 fecha_modificacion = NOW()
             WHERE id = $2 AND tienda_id = $3
             RETURNING id, tipo_proveedor, tipo_documento, documento, razon_social, telefono, estado, fecha_registro, fecha_modificacion`,
            [estado, id, req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: `Proveedor ${estado ? "habilitado" : "deshabilitado"} correctamente`,
            data: { proveedor: formatearProveedor(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al cambiar estado del proveedor");
    }
};

module.exports = {
    registrarProveedor,
    obtenerProveedores,
    obtenerProveedorPorID,
    listarProveedores,
    cambiarEstadoProveedor,
    obtenerPorDocumentoYRazonSocial,
    editarProveedor
};
