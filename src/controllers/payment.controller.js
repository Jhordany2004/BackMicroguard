const { query } = require("../config/database");

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";

const formatearMetodoPago = (metodoPago) => ({
    id: metodoPago.id,
    nombre: metodoPago.nombre,
    estado: metodoPago.estado,
    fechaRegistro: metodoPago.fecha_registro,
    fechaModificacion: metodoPago.fecha_modificacion
});

const responderError = (res, error, mensaje) => {
    if (error?.code === "23505") {
        return res.status(409).json({
            success: false,
            message: "Ya existe un metodo de pago con ese nombre"
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
            message: "ID de metodo de pago invalido"
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

const registrarMetodoPago = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const nombre = normalizarTexto(req.body.nombre);

        if (!nombre) {
            return res.status(400).json({
                success: false,
                message: "El nombre es obligatorio"
            });
        }

        const result = await query(
            `INSERT INTO metodos_pago (tienda_id, nombre)
             VALUES ($1, $2)
             RETURNING id, nombre, estado, fecha_registro, fecha_modificacion`,
            [req.idTienda, nombre]
        );

        return res.status(201).json({
            success: true,
            message: "Metodo de pago registrado correctamente",
            data: { metodoPago: formatearMetodoPago(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al registrar metodo de pago");
    }
};

const listarMetodoPago = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const result = await query(
            `SELECT id, nombre, estado, fecha_registro, fecha_modificacion
             FROM metodos_pago
             WHERE tienda_id = $1
             ORDER BY fecha_registro DESC`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Metodos de pago obtenidos correctamente" : "No hay metodos de pago registrados",
            data: { metodosPago: result.rows.map(formatearMetodoPago) }
        });
    } catch (error) {
        return responderError(res, error, "Error al listar metodos de pago");
    }
};

const obtenerMetodoPago = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const result = await query(
            `SELECT id, nombre, estado, fecha_registro, fecha_modificacion
             FROM metodos_pago
             WHERE tienda_id = $1 AND estado = TRUE
             ORDER BY nombre ASC`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Metodos de pago activos obtenidos correctamente" : "No hay metodos de pago activos",
            data: { metodosPago: result.rows.map(formatearMetodoPago) }
        });
    } catch (error) {
        return responderError(res, error, "Error al obtener metodos de pago activos");
    }
};

const buscarMetodoPago = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const result = await query(
            `SELECT id, nombre, estado, fecha_registro, fecha_modificacion
             FROM metodos_pago
             WHERE id = $1 AND tienda_id = $2
             LIMIT 1`,
            [id, req.idTienda]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Metodo de pago no encontrado"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Metodo de pago obtenido correctamente",
            data: { metodoPago: formatearMetodoPago(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al buscar metodo de pago");
    }
};

const editarMetodoPago = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const nombre = normalizarTexto(req.body.nombre);

        if (!nombre) {
            return res.status(400).json({
                success: false,
                message: "El nombre es obligatorio"
            });
        }

        const result = await query(
            `UPDATE metodos_pago
             SET nombre = $1,
                 fecha_modificacion = NOW()
             WHERE id = $2 AND tienda_id = $3
             RETURNING id, nombre, estado, fecha_registro, fecha_modificacion`,
            [nombre, id, req.idTienda]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Metodo de pago no encontrado"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Metodo de pago actualizado correctamente",
            data: { metodoPago: formatearMetodoPago(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al editar metodo de pago");
    }
};

const cambiarEstadoMetodoPago = async (req, res) => {
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
             FROM metodos_pago
             WHERE id = $1 AND tienda_id = $2
             LIMIT 1`,
            [id, req.idTienda]
        );

        if (!actual.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Metodo de pago no encontrado"
            });
        }

        if (actual.rows[0].estado === estado) {
            return res.status(400).json({
                success: false,
                message: `El metodo de pago ya esta ${estado ? "habilitado" : "deshabilitado"}`
            });
        }

        const result = await query(
            `UPDATE metodos_pago
             SET estado = $1,
                 fecha_modificacion = NOW()
             WHERE id = $2 AND tienda_id = $3
             RETURNING id, nombre, estado, fecha_registro, fecha_modificacion`,
            [estado, id, req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: `Metodo de pago ${estado ? "habilitado" : "deshabilitado"} correctamente`,
            data: { metodoPago: formatearMetodoPago(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al cambiar estado del metodo de pago");
    }
};

module.exports = {
    registrarMetodoPago,
    listarMetodoPago,
    obtenerMetodoPago,
    buscarMetodoPago,
    editarMetodoPago,
    cambiarEstadoMetodoPago
};
