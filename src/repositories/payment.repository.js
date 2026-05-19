const { query } = require("../config/database");

const PAYMENT_COLUMNS = "id, nombre, estado, fecha_registro, fecha_modificacion";

const create = async ({ tiendaId, nombre }) => {
    const result = await query(
        `INSERT INTO metodos_pago (tienda_id, nombre)
         VALUES ($1, $2)
         RETURNING ${PAYMENT_COLUMNS}`,
        [tiendaId, nombre]
    );

    return result.rows[0];
};

const findAllByStore = async (tiendaId) => {
    const result = await query(
        `SELECT ${PAYMENT_COLUMNS}
         FROM metodos_pago
         WHERE tienda_id = $1
         ORDER BY fecha_registro DESC`,
        [tiendaId]
    );

    return result.rows;
};

const findActiveByStore = async (tiendaId) => {
    const result = await query(
        `SELECT ${PAYMENT_COLUMNS}
         FROM metodos_pago
         WHERE tienda_id = $1 AND estado = TRUE
         ORDER BY nombre ASC`,
        [tiendaId]
    );

    return result.rows;
};

const findByIdAndStore = async (id, tiendaId) => {
    const result = await query(
        `SELECT ${PAYMENT_COLUMNS}
         FROM metodos_pago
         WHERE id = $1 AND tienda_id = $2
         LIMIT 1`,
        [id, tiendaId]
    );

    return result.rows[0] || null;
};

const update = async ({ id, tiendaId, nombre }) => {
    const result = await query(
        `UPDATE metodos_pago
         SET nombre = $1,
             fecha_modificacion = NOW()
         WHERE id = $2 AND tienda_id = $3
         RETURNING ${PAYMENT_COLUMNS}`,
        [nombre, id, tiendaId]
    );

    return result.rows[0] || null;
};

const updateStatus = async ({ id, tiendaId, estado }) => {
    const result = await query(
        `UPDATE metodos_pago
         SET estado = $1,
             fecha_modificacion = NOW()
         WHERE id = $2 AND tienda_id = $3
         RETURNING ${PAYMENT_COLUMNS}`,
        [estado, id, tiendaId]
    );

    return result.rows[0] || null;
};

module.exports = {
    create,
    findAllByStore,
    findActiveByStore,
    findByIdAndStore,
    update,
    updateStatus
};
