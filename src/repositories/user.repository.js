const findByFirebaseUidOrEmail = async (client, firebaseUid, email) => {
    const result = await client.query(
        `SELECT id
         FROM usuarios
         WHERE firebase_uid = $1 OR correo = $2
         LIMIT 1`,
        [firebaseUid, email]
    );

    return result.rows[0] || null;
};

const findStoreByRuc = async (client, ruc) => {
    const result = await client.query(
        "SELECT id FROM tiendas WHERE ruc = $1 LIMIT 1",
        [ruc]
    );

    return result.rows[0] || null;
};

const createStore = async (client, { ruc, nombre, razonSocial }) => {
    const result = await client.query(
        `INSERT INTO tiendas (ruc, nombre, razon_social, stock_minimo, dias_alerta_vencimiento, tipo_moneda)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, ruc, nombre, razon_social`,
        [ruc, nombre, razonSocial, 50, 7, "PEN"]
    );

    return result.rows[0];
};

const createUser = async (client, { tiendaId, firebaseUid, nombres, apellidos, correo, celular }) => {
    const result = await client.query(
        `INSERT INTO usuarios (tienda_id, firebase_uid, nombres, apellidos, correo, celular, rol)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, tienda_id, firebase_uid, nombres, apellidos, correo, celular, rol, estado`,
        [tiendaId, firebaseUid, nombres, apellidos, correo, celular || null, "admin"]
    );

    return result.rows[0];
};

const createGeneralCustomer = async (client, tiendaId) => {
    await client.query(
        `INSERT INTO clientes (tienda_id, tipo_cliente, nombres)
         VALUES ($1, $2, $3)`,
        [tiendaId, "General", "Cliente General"]
    );
};

const createPaymentMethod = async (client, tiendaId, method) => {
    await client.query(
        `INSERT INTO metodos_pago (tienda_id, nombre, estado)
         VALUES ($1, $2, $3)`,
        [tiendaId, method.nombre, method.estado]
    );
};

const createCategory = async (client, tiendaId, category) => {
    await client.query(
        `INSERT INTO categorias (tienda_id, nombre, descripcion)
         VALUES ($1, $2, $3)`,
        [tiendaId, category.nombre, category.descripcion]
    );
};

const saveFcmToken = async (client, usuarioId, token) => {
    if (!token) return;

    await client.query(
        `INSERT INTO tokens_fcm (usuario_id, token)
         VALUES ($1, $2)
         ON CONFLICT (usuario_id, token) DO NOTHING`,
        [usuarioId, token]
    );
};

const findSessionByFirebaseUid = async (client, firebaseUid) => {
    const result = await client.query(
        `SELECT
            u.id, u.tienda_id, u.firebase_uid, u.nombres, u.apellidos, u.correo, u.celular, u.rol, u.estado,
            t.id AS tienda_id_real, t.ruc, t.nombre, t.razon_social
         FROM usuarios u
         LEFT JOIN tiendas t ON t.id = u.tienda_id
         WHERE u.firebase_uid = $1
         LIMIT 1`,
        [firebaseUid]
    );

    return result.rows[0] || null;
};

const deleteFcmToken = async (client, usuarioId, token) => {
    await client.query(
        "DELETE FROM tokens_fcm WHERE usuario_id = $1 AND token = $2",
        [usuarioId, token]
    );
};

module.exports = {
    findByFirebaseUidOrEmail,
    findStoreByRuc,
    createStore,
    createUser,
    createGeneralCustomer,
    createPaymentMethod,
    createCategory,
    saveFcmToken,
    findSessionByFirebaseUid,
    deleteFcmToken
};
