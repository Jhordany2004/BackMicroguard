const { query } = require("../config/database");

const SUPPLIER_COLUMNS = "id, tipo_proveedor, tipo_documento, documento, razon_social, telefono, estado, fecha_registro, fecha_modificacion";

const create = async ({ tiendaId, data }) => {
    const result = await query(
        `INSERT INTO proveedores (tienda_id, tipo_proveedor, tipo_documento, documento, razon_social, telefono)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING ${SUPPLIER_COLUMNS}`,
        [tiendaId, data.tipoProveedor, data.tipoDocumento, data.documento, data.razonSocial, data.telefono || null]
    );

    return result.rows[0];
};

const findAllByStore = async (tiendaId) => {
    const result = await query(
        `SELECT ${SUPPLIER_COLUMNS}
         FROM proveedores
         WHERE tienda_id = $1
         ORDER BY fecha_registro DESC
         LIMIT 50`,
        [tiendaId]
    );

    return result.rows;
};

const findActiveByStore = async (tiendaId) => {
    const result = await query(
        `SELECT ${SUPPLIER_COLUMNS}
         FROM proveedores
         WHERE tienda_id = $1 AND estado = TRUE
         ORDER BY razon_social ASC
         LIMIT 50`,
        [tiendaId]
    );

    return result.rows;
};

const findByIdAndStore = async (id, tiendaId) => {
    const result = await query(
        `SELECT ${SUPPLIER_COLUMNS}
         FROM proveedores
         WHERE id = $1 AND tienda_id = $2
         LIMIT 1`,
        [id, tiendaId]
    );

    return result.rows[0] || null;
};

const searchActive = async ({ tiendaId, documento, razonSocial }) => {
    const filters = ["tienda_id = $1", "estado = TRUE"];
    const values = [tiendaId];

    if (documento) {
        values.push(documento);
        filters.push(`documento = $${values.length}`);
    }

    if (razonSocial) {
        values.push(`%${razonSocial}%`);
        filters.push(`razon_social ILIKE $${values.length}`);
    }

    const result = await query(
        `SELECT ${SUPPLIER_COLUMNS}
         FROM proveedores
         WHERE ${filters.join(" AND ")}
         ORDER BY razon_social ASC
         LIMIT 50`,
        values
    );

    return result.rows;
};

const update = async ({ id, tiendaId, razonSocial, telefono }) => {
    const result = await query(
        `UPDATE proveedores
         SET razon_social = $1,
             telefono = $2,
             fecha_modificacion = NOW()
         WHERE id = $3 AND tienda_id = $4
         RETURNING ${SUPPLIER_COLUMNS}`,
        [razonSocial, telefono || null, id, tiendaId]
    );

    return result.rows[0] || null;
};

const updateStatus = async ({ id, tiendaId, estado }) => {
    const result = await query(
        `UPDATE proveedores
         SET estado = $1,
             fecha_modificacion = NOW()
         WHERE id = $2 AND tienda_id = $3
         RETURNING ${SUPPLIER_COLUMNS}`,
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
