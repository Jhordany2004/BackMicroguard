const { query } = require("../config/database");

const CATEGORY_COLUMNS = "id, nombre, descripcion, estado, fecha_registro, fecha_modificacion";

const create = async ({ tiendaId, nombre, descripcion }) => {
    const result = await query(
        `INSERT INTO categorias (tienda_id, nombre, descripcion)
         VALUES ($1, $2, $3)
         RETURNING ${CATEGORY_COLUMNS}`,
        [tiendaId, nombre, descripcion || null]
    );

    return result.rows[0];
};

const findAllByStore = async (tiendaId) => {
    const result = await query(
        `SELECT ${CATEGORY_COLUMNS}
         FROM categorias
         WHERE tienda_id = $1
         ORDER BY fecha_registro DESC`,
        [tiendaId]
    );

    return result.rows;
};

const findActiveByStore = async (tiendaId) => {
    const result = await query(
        `SELECT ${CATEGORY_COLUMNS}
         FROM categorias
         WHERE tienda_id = $1 AND estado = TRUE
         ORDER BY nombre ASC`,
        [tiendaId]
    );

    return result.rows;
};

const findInactiveByStore = async (tiendaId) => {
    const result = await query(
        `SELECT ${CATEGORY_COLUMNS}
         FROM categorias
         WHERE tienda_id = $1 AND estado = FALSE
         ORDER BY nombre ASC`,
        [tiendaId]
    );

    return result.rows;
};

const findByIdAndStore = async (id, tiendaId) => {
    const result = await query(
        `SELECT ${CATEGORY_COLUMNS}
         FROM categorias
         WHERE id = $1 AND tienda_id = $2
         LIMIT 1`,
        [id, tiendaId]
    );

    return result.rows[0] || null;
};

const update = async ({ id, tiendaId, nombre, descripcion }) => {
    const result = await query(
        `UPDATE categorias
         SET nombre = $1,
             descripcion = $2,
             fecha_modificacion = NOW()
         WHERE id = $3 AND tienda_id = $4
         RETURNING ${CATEGORY_COLUMNS}`,
        [nombre, descripcion || null, id, tiendaId]
    );

    return result.rows[0] || null;
};

const updateStatus = async ({ id, tiendaId, estado }) => {
    const result = await query(
        `UPDATE categorias
         SET estado = $1,
             fecha_modificacion = NOW()
         WHERE id = $2 AND tienda_id = $3
         RETURNING ${CATEGORY_COLUMNS}`,
        [estado, id, tiendaId]
    );

    return result.rows[0] || null;
};

module.exports = {
    create,
    findAllByStore,
    findActiveByStore,
    findInactiveByStore,
    findByIdAndStore,
    update,
    updateStatus
};
