const { query } = require("../config/database");

const CUSTOMER_COLUMNS = "id, tipo_cliente, tipo_documento, documento, nombres, apellidos, razon_social, telefono, estado, fecha_registro, fecha_modificacion";

const create = async ({ tiendaId, data }) => {
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
         RETURNING ${CUSTOMER_COLUMNS}`,
        [
            tiendaId,
            data.tipoCliente,
            data.tipoDocumento,
            data.documento,
            data.nombres,
            data.apellidos,
            data.razonSocial,
            data.telefono
        ]
    );

    return result.rows[0];
};

const findAllByStore = async (tiendaId) => {
    const result = await query(
        `SELECT ${CUSTOMER_COLUMNS}
         FROM clientes
         WHERE tienda_id = $1
         ORDER BY fecha_registro DESC
         LIMIT 50`,
        [tiendaId]
    );

    return result.rows;
};

const findActiveByStore = async (tiendaId) => {
    const result = await query(
        `SELECT ${CUSTOMER_COLUMNS}
         FROM clientes
         WHERE tienda_id = $1 AND estado = TRUE
         ORDER BY COALESCE(razon_social, nombres) ASC, apellidos ASC
         LIMIT 50`,
        [tiendaId]
    );

    return result.rows;
};

const findByIdAndStore = async (id, tiendaId) => {
    const result = await query(
        `SELECT ${CUSTOMER_COLUMNS}
         FROM clientes
         WHERE id = $1 AND tienda_id = $2
         LIMIT 1`,
        [id, tiendaId]
    );

    return result.rows[0] || null;
};

const searchActive = async ({ tiendaId, documento, nombre }) => {
    const filters = ["tienda_id = $1", "estado = TRUE"];
    const values = [tiendaId];

    if (documento) {
        values.push(documento);
        filters.push(`documento = $${values.length}`);
    }

    if (nombre) {
        values.push(`%${nombre}%`);
        filters.push(`(nombres ILIKE $${values.length} OR apellidos ILIKE $${values.length} OR razon_social ILIKE $${values.length})`);
    }

    const result = await query(
        `SELECT ${CUSTOMER_COLUMNS}
         FROM clientes
         WHERE ${filters.join(" AND ")}
         ORDER BY COALESCE(razon_social, nombres) ASC, apellidos ASC
         LIMIT 50`,
        values
    );

    return result.rows;
};

const update = async ({ id, tiendaId, data }) => {
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
         RETURNING ${CUSTOMER_COLUMNS}`,
        [
            data.tipoCliente,
            data.tipoDocumento,
            data.documento,
            data.nombres,
            data.apellidos,
            data.razonSocial,
            data.telefono || null,
            id,
            tiendaId
        ]
    );

    return result.rows[0] || null;
};

const updateStatus = async ({ id, tiendaId, estado }) => {
    const result = await query(
        `UPDATE clientes
         SET estado = $1,
             fecha_modificacion = NOW()
         WHERE id = $2 AND tienda_id = $3
         RETURNING ${CUSTOMER_COLUMNS}`,
        [estado, id, tiendaId]
    );

    return result.rows[0] || null;
};

module.exports = {
    create,
    findAllByStore,
    findActiveByStore,
    findByIdAndStore,
    searchActive,
    update,
    updateStatus
};
