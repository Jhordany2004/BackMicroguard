const { query } = require("../config/database");

const BASE_SELECT = `
    SELECT
        p.id,
        p.nombre,
        p.cod_barras,
        p.cod_interno,
        p.imagen_url,
        p.cantidad_medida,
        p.medida,
        p.precio_venta,
        p.perecible,
        p.estado,
        p.categoria_id,
        c.nombre AS categoria_nombre,
        p.fecha_registro,
        p.fecha_modificacion
    FROM productos p
    INNER JOIN categorias c ON c.id = p.categoria_id
`;

const findCategoryActiveByStore = async (categoriaId, tiendaId) => {
    const result = await query(
        `SELECT id
         FROM categorias
         WHERE id = $1 AND tienda_id = $2 AND estado = TRUE
         LIMIT 1`,
        [categoriaId, tiendaId]
    );

    return result.rows[0] || null;
};

const create = async ({ tiendaId, data }) => {
    const result = await query(
        `INSERT INTO productos (
            tienda_id,
            categoria_id,
            nombre,
            cod_barras,
            cod_interno,
            imagen_url,
            cantidad_medida,
            medida,
            precio_venta,
            perecible
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING id`,
        [
            tiendaId,
            data.categoriaId,
            data.nombre,
            data.codBarras,
            data.codInterno,
            data.imagenUrl,
            data.cantidadMedida,
            data.medida,
            data.precioVenta,
            data.perecible
        ]
    );

    return result.rows[0];
};

const findByIdAndStore = async (id, tiendaId) => {
    const result = await query(
        `${BASE_SELECT}
         WHERE p.id = $1 AND p.tienda_id = $2
         LIMIT 1`,
        [id, tiendaId]
    );

    return result.rows[0] || null;
};

const findEditableByIdAndStore = async (id, tiendaId) => {
    const result = await query(
        `SELECT id, categoria_id, nombre, cod_barras, cod_interno, imagen_url, cantidad_medida, medida, precio_venta, perecible, estado
         FROM productos
         WHERE id = $1 AND tienda_id = $2
         LIMIT 1`,
        [id, tiendaId]
    );

    return result.rows[0] || null;
};

const findAllByStore = async (tiendaId) => {
    const result = await query(
        `${BASE_SELECT}
         WHERE p.tienda_id = $1
         ORDER BY p.fecha_registro DESC
         LIMIT 100`,
        [tiendaId]
    );

    return result.rows;
};

const findActiveByStore = async (tiendaId) => {
    const result = await query(
        `${BASE_SELECT}
         WHERE p.tienda_id = $1 AND p.estado = TRUE
         ORDER BY p.nombre ASC
         LIMIT 100`,
        [tiendaId]
    );

    return result.rows;
};

const findSuggestions = async ({ tiendaId, text, categoriaId, limit }) => {
    const filters = ["p.tienda_id = $1", "p.estado = TRUE"];
    const values = [tiendaId];

    if (categoriaId) {
        values.push(categoriaId);
        filters.push(`p.categoria_id = $${values.length}`);
    }

    values.push(`${text}%`);
    filters.push(`(p.nombre ILIKE $${values.length} OR p.cod_barras ILIKE $${values.length} OR p.cod_interno ILIKE $${values.length})`);
    values.push(limit);

    const result = await query(
        `${BASE_SELECT}
         WHERE ${filters.join(" AND ")}
         ORDER BY p.nombre ASC
         LIMIT $${values.length}`,
        values
    );

    return result.rows;
};

const search = async ({ tiendaId, text, categoriaId, limit, offset }) => {
    const filters = ["p.tienda_id = $1", "p.estado = TRUE"];
    const values = [tiendaId];

    if (categoriaId) {
        values.push(categoriaId);
        filters.push(`p.categoria_id = $${values.length}`);
    }

    if (text) {
        values.push(`%${text}%`);
        filters.push(`(p.nombre ILIKE $${values.length} OR p.cod_barras ILIKE $${values.length} OR p.cod_interno ILIKE $${values.length})`);
    }

    const countResult = await query(
        `SELECT COUNT(*)::INT AS total
         FROM productos p
         WHERE ${filters.join(" AND ")}`,
        values
    );

    const listValues = [...values, limit, offset];
    const result = await query(
        `${BASE_SELECT}
         WHERE ${filters.join(" AND ")}
         ORDER BY p.nombre ASC
         LIMIT $${listValues.length - 1}
         OFFSET $${listValues.length}`,
        listValues
    );

    return {
        rows: result.rows,
        total: countResult.rows[0]?.total || 0
    };
};

const findByCode = async ({ tiendaId, codigo, codigoInterno }) => {
    const result = await query(
        `${BASE_SELECT}
         WHERE p.tienda_id = $1
           AND p.estado = TRUE
           AND (p.cod_barras = $2 OR p.cod_interno = $3)
         LIMIT 1`,
        [tiendaId, codigo, codigoInterno]
    );

    return result.rows[0] || null;
};

const update = async ({ id, tiendaId, data }) => {
    await query(
        `UPDATE productos
         SET categoria_id = $1,
             nombre = $2,
             cod_barras = $3,
             cod_interno = $4,
             imagen_url = $5,
             cantidad_medida = $6,
             medida = $7,
             precio_venta = $8,
             perecible = $9,
             fecha_modificacion = NOW()
         WHERE id = $10 AND tienda_id = $11`,
        [
            data.categoriaId,
            data.nombre,
            data.codBarras,
            data.codInterno,
            data.imagenUrl,
            data.cantidadMedida,
            data.medida,
            data.precioVenta,
            data.perecible,
            id,
            tiendaId
        ]
    );
};

const updateStatus = async ({ id, tiendaId, estado }) => {
    await query(
        `UPDATE productos
         SET estado = $1,
             fecha_modificacion = NOW()
         WHERE id = $2 AND tienda_id = $3`,
        [estado, id, tiendaId]
    );
};

module.exports = {
    findCategoryActiveByStore,
    create,
    findByIdAndStore,
    findEditableByIdAndStore,
    findAllByStore,
    findActiveByStore,
    findSuggestions,
    search,
    findByCode,
    update,
    updateStatus
};
