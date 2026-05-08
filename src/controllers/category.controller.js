const { query } = require("../config/database");

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";

const formatearCategoria = (categoria) => ({
    id: categoria.id,
    nombre: categoria.nombre,
    descripcion: categoria.descripcion || "",
    estado: categoria.estado,
    fechaRegistro: categoria.fecha_registro,
    fechaModificacion: categoria.fecha_modificacion
});

const responderError = (res, error, mensaje) => {
    if (error?.code === "23505") {
        return res.status(409).json({
            success: false,
            message: "Ya existe una categoria con ese nombre"
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
            message: "ID de categoria invalido"
        });
        return null;
    }

    return numero;
};

const registrarCategoria = async (req, res) => {
    try {
        const nombre = normalizarTexto(req.body.nombre);
        const descripcion = normalizarTexto(req.body.descripcion);

        if (!req.idTienda) {
            return res.status(403).json({
                success: false,
                message: "Usuario sin tienda asociada"
            });
        }

        if (!nombre) {
            return res.status(400).json({
                success: false,
                message: "El nombre es obligatorio"
            });
        }

        const result = await query(
            `INSERT INTO categorias (tienda_id, nombre, descripcion)
             VALUES ($1, $2, $3)
             RETURNING id, nombre, descripcion, estado, fecha_registro, fecha_modificacion`,
            [req.idTienda, nombre, descripcion || null]
        );

        return res.status(201).json({
            success: true,
            message: "Categoria registrada correctamente",
            data: { categoria: formatearCategoria(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al registrar categoria");
    }
};

const listarCategoria = async (req, res) => {
    try {
        const result = await query(
            `SELECT id, nombre, descripcion, estado, fecha_registro, fecha_modificacion
             FROM categorias
             WHERE tienda_id = $1
             ORDER BY fecha_registro DESC`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Categorias obtenidas correctamente" : "No hay categorias registradas",
            data: { categorias: result.rows.map(formatearCategoria) }
        });
    } catch (error) {
        return responderError(res, error, "Error al listar categorias");
    }
};

const obtenerCategoria = async (req, res) => {
    try {
        const result = await query(
            `SELECT id, nombre, descripcion, estado, fecha_registro, fecha_modificacion
             FROM categorias
             WHERE tienda_id = $1 AND estado = TRUE
             ORDER BY nombre ASC`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Categorias activas obtenidas correctamente" : "No hay categorias activas",
            data: { categorias: result.rows.map(formatearCategoria) }
        });
    } catch (error) {
        return responderError(res, error, "Error al obtener categorias activas");
    }
};

const obtenerCategoriasInactivas = async (req, res) => {
    try {
        const result = await query(
            `SELECT id, nombre, descripcion, estado, fecha_registro, fecha_modificacion
             FROM categorias
             WHERE tienda_id = $1 AND estado = FALSE
             ORDER BY nombre ASC`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Categorias inactivas obtenidas correctamente" : "No hay categorias inactivas",
            data: { categorias: result.rows.map(formatearCategoria) }
        });
    } catch (error) {
        return responderError(res, error, "Error al obtener categorias inactivas");
    }
};

const buscarCategoria = async (req, res) => {
    try {
        const id = validarId(req.params.id, res);
        if (!id) return;

        const result = await query(
            `SELECT id, nombre, descripcion, estado, fecha_registro, fecha_modificacion
             FROM categorias
             WHERE id = $1 AND tienda_id = $2
             LIMIT 1`,
            [id, req.idTienda]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Categoria no encontrada"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Categoria obtenida correctamente",
            data: { categoria: formatearCategoria(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al buscar categoria");
    }
};

const editarCategoria = async (req, res) => {
    try {
        const id = validarId(req.params.id, res);
        if (!id) return;

        const nombre = normalizarTexto(req.body.nombre);
        const descripcion = normalizarTexto(req.body.descripcion);

        if (!nombre && !descripcion) {
            return res.status(400).json({
                success: false,
                message: "Debe enviar nombre o descripcion para actualizar"
            });
        }

        const actual = await query(
            `SELECT id, nombre, descripcion
             FROM categorias
             WHERE id = $1 AND tienda_id = $2
             LIMIT 1`,
            [id, req.idTienda]
        );

        if (!actual.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Categoria no encontrada"
            });
        }

        const nombreFinal = nombre || actual.rows[0].nombre;
        const descripcionFinal = descripcion || actual.rows[0].descripcion;

        const result = await query(
            `UPDATE categorias
             SET nombre = $1,
                 descripcion = $2,
                 fecha_modificacion = NOW()
             WHERE id = $3 AND tienda_id = $4
             RETURNING id, nombre, descripcion, estado, fecha_registro, fecha_modificacion`,
            [nombreFinal, descripcionFinal || null, id, req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: "Categoria actualizada correctamente",
            data: { categoria: formatearCategoria(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al editar categoria");
    }
};

const cambiarEstadoCategoria = async (req, res) => {
    try {
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
             FROM categorias
             WHERE id = $1 AND tienda_id = $2
             LIMIT 1`,
            [id, req.idTienda]
        );

        if (!actual.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Categoria no encontrada"
            });
        }

        if (actual.rows[0].estado === estado) {
            return res.status(400).json({
                success: false,
                message: `La categoria ya esta ${estado ? "habilitada" : "deshabilitada"}`
            });
        }

        const result = await query(
            `UPDATE categorias
             SET estado = $1,
                 fecha_modificacion = NOW()
             WHERE id = $2 AND tienda_id = $3
             RETURNING id, nombre, descripcion, estado, fecha_registro, fecha_modificacion`,
            [estado, id, req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: `Categoria ${estado ? "habilitada" : "deshabilitada"} correctamente`,
            data: { categoria: formatearCategoria(result.rows[0]) }
        });
    } catch (error) {
        return responderError(res, error, "Error al cambiar estado de categoria");
    }
};

module.exports = {
    registrarCategoria,
    obtenerCategoria,
    buscarCategoria,
    listarCategoria,
    editarCategoria,
    cambiarEstadoCategoria,
    obtenerCategoriasInactivas
};
