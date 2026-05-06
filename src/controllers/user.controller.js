const admin = require("../config/firebase");
const { pool, query } = require("../config/database");
const { fetchRuc } = require("../services/ruc.service");
const sendBrevoEmail = require("../config/mailer");

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";
const normalizarCorreo = (valor) => normalizarTexto(valor).toLowerCase();

const categoriasIniciales = [
    { nombre: "Abarrotes", descripcion: "Productos de primera necesidad" },
    { nombre: "Bebidas", descripcion: "Todo tipo de bebidas" },
    { nombre: "Limpieza", descripcion: "Productos de limpieza" },
    { nombre: "Snacks", descripcion: "Productos para picar" },
    { nombre: "Otros", descripcion: "Productos varios" }
];

const metodosPagoIniciales = [
    { nombre: "Efectivo", estado: true },
    { nombre: "Yape", estado: true },
    { nombre: "Plin", estado: true },
    { nombre: "Transferencia", estado: false }
];

const responderError = (res, error, mensaje) => {
    if (error?.status) {
        return res.status(error.status).json({ success: false, message: error.message });
    }

    if (error?.code === "23505") {
        return res.status(409).json({ success: false, message: "Ya existe un registro con esos datos" });
    }

    return res.status(500).json({
        success: false,
        message: error.message || mensaje
    });
};

const obtenerTokenFirebase = (req) => {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }

    return req.body.idToken || req.body.tokenFirebase || null;
};

const verificarFirebaseToken = async (req) => {
    const token = obtenerTokenFirebase(req);

    if (!token) {
        const error = new Error("Token de Firebase no proporcionado");
        error.status = 401;
        throw error;
    }

    return admin.auth().verifyIdToken(token);
};

const formatearUsuario = (usuario, tienda = null) => ({
    id: usuario.id,
    firebaseUid: usuario.firebase_uid,
    nombres: usuario.nombres,
    apellidos: usuario.apellidos,
    correo: usuario.correo,
    celular: usuario.celular,
    rol: usuario.rol,
    estado: usuario.estado,
    tienda: tienda ? {
        id: tienda.id,
        ruc: tienda.ruc,
        nombre: tienda.nombre,
        razonSocial: tienda.razon_social
    } : null
});

const guardarTokenFcm = async (client, usuarioId, fcmToken) => {
    const token = normalizarTexto(fcmToken);
    if (!token) return;

    await client.query(
        `INSERT INTO tokens_fcm (usuario_id, token)
         VALUES ($1, $2)
         ON CONFLICT (usuario_id, token) DO NOTHING`,
        [usuarioId, token]
    );
};

const registrarUsuario = async (req, res) => {
    const client = await pool.connect();

    try {
        const firebaseUser = await verificarFirebaseToken(req);

        const nombres = normalizarTexto(req.body.nombres || req.body.Nombres);
        const apellidos = normalizarTexto(req.body.apellidos || req.body.Apellidos);
        const celular = normalizarTexto(req.body.celular || req.body.Celular);
        const ruc = normalizarTexto(req.body.ruc || req.body.RUC);
        const nombreTienda = normalizarTexto(req.body.nombreTienda || req.body.NombreTienda);
        const fcmToken = req.body.fcmToken;
        const correo = normalizarCorreo(firebaseUser.email);

        if (!firebaseUser.uid || !correo) {
            return res.status(400).json({
                success: false,
                message: "El token de Firebase debe incluir uid y correo"
            });
        }

        if (!nombres || !apellidos || !ruc || !nombreTienda) {
            return res.status(400).json({
                success: false,
                message: "Nombres, apellidos, RUC y nombre de tienda son obligatorios"
            });
        }

        if (!/^\d{11}$/.test(ruc)) {
            return res.status(400).json({
                success: false,
                message: "El RUC debe tener 11 digitos numericos"
            });
        }

        if (celular && !/^\d{9}$/.test(celular)) {
            return res.status(400).json({
                success: false,
                message: "El celular debe tener 9 digitos numericos"
            });
        }

        const rucResult = await fetchRuc(ruc);
        const razonSocial = rucResult?.razon_social || rucResult?.razonSocial;

        if (!razonSocial) {
            return res.status(400).json({
                success: false,
                message: "No se pudo obtener la razon social del RUC"
            });
        }

        await client.query("BEGIN");

        const usuarioExistente = await client.query(
            `SELECT id
             FROM usuarios
             WHERE firebase_uid = $1 OR correo = $2
             LIMIT 1`,
            [firebaseUser.uid, correo]
        );

        if (usuarioExistente.rows.length) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                success: false,
                message: "El usuario ya esta registrado"
            });
        }

        const tiendaExistente = await client.query(
            "SELECT id FROM tiendas WHERE ruc = $1 LIMIT 1",
            [ruc]
        );

        if (tiendaExistente.rows.length) {
            await client.query("ROLLBACK");
            return res.status(409).json({
                success: false,
                message: "Ya existe una tienda con ese RUC"
            });
        }

        const tiendaResult = await client.query(
            `INSERT INTO tiendas (ruc, nombre, razon_social, stock_minimo, dias_alerta_vencimiento, tipo_moneda)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, ruc, nombre, razon_social`,
            [ruc, nombreTienda, razonSocial, 50, 7, "PEN"]
        );

        const tienda = tiendaResult.rows[0];

        const usuarioResult = await client.query(
            `INSERT INTO usuarios (tienda_id, firebase_uid, nombres, apellidos, correo, celular, rol)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id, tienda_id, firebase_uid, nombres, apellidos, correo, celular, rol, estado`,
            [tienda.id, firebaseUser.uid, nombres, apellidos, correo, celular || null, "admin"]
        );

        const usuario = usuarioResult.rows[0];

        for (const metodo of metodosPagoIniciales) {
            await client.query(
                `INSERT INTO metodos_pago (tienda_id, nombre, estado)
                 VALUES ($1, $2, $3)`,
                [tienda.id, metodo.nombre, metodo.estado]
            );
        }

        for (const categoria of categoriasIniciales) {
            await client.query(
                `INSERT INTO categorias (tienda_id, nombre, descripcion)
                 VALUES ($1, $2, $3)`,
                [tienda.id, categoria.nombre, categoria.descripcion]
            );
        }

        await guardarTokenFcm(client, usuario.id, fcmToken);

        await client.query("COMMIT");

        return res.status(201).json({
            success: true,
            message: "Usuario y tienda registrados correctamente",
            data: {
                usuario: formatearUsuario(usuario, tienda)
            }
        });
    } catch (error) {
        await client.query("ROLLBACK").catch(() => {});
        return responderError(res, error, "Error al registrar usuario");
    } finally {
        client.release();
    }
};

const loginUsuario = async (req, res) => {
    const client = await pool.connect();

    try {
        const firebaseUser = await verificarFirebaseToken(req);
        const fcmToken = req.body.fcmToken;

        const result = await client.query(
            `SELECT
                u.id, u.tienda_id, u.firebase_uid, u.nombres, u.apellidos, u.correo, u.celular, u.rol, u.estado,
                t.id AS tienda_id_real, t.ruc, t.nombre, t.razon_social
             FROM usuarios u
             LEFT JOIN tiendas t ON t.id = u.tienda_id
             WHERE u.firebase_uid = $1
             LIMIT 1`,
            [firebaseUser.uid]
        );

        const row = result.rows[0];

        if (!row) {
            return res.status(200).json({
                success: true,
                message: "Usuario autenticado con Firebase, debe completar registro",
                data: {
                    requiereRegistro: true,
                    firebase: {
                        uid: firebaseUser.uid,
                        correo: firebaseUser.email || null
                    }
                }
            });
        }

        if (!row.estado) {
            return res.status(403).json({
                success: false,
                message: "Usuario inhabilitado"
            });
        }

        await guardarTokenFcm(client, row.id, fcmToken);

        return res.status(200).json({
            success: true,
            message: "Inicio de sesion exitoso",
            data: {
                requiereRegistro: false,
                usuario: formatearUsuario(row, {
                    id: row.tienda_id_real,
                    ruc: row.ruc,
                    nombre: row.nombre,
                    razon_social: row.razon_social
                })
            }
        });
    } catch (error) {
        return responderError(res, error, "Error al iniciar sesion");
    } finally {
        client.release();
    }
};

const cerrarSesion = async (req, res) => {
    try {
        const fcmToken = normalizarTexto(req.body.fcmToken);

        if (fcmToken) {
            await query(
                "DELETE FROM tokens_fcm WHERE usuario_id = $1 AND token = $2",
                [req.usuarioId, fcmToken]
            );
        }

        return res.status(200).json({
            success: true,
            message: "Sesion cerrada correctamente"
        });
    } catch (error) {
        return responderError(res, error, "Error al cerrar sesion");
    }
};

const recuperarContrasena = async (req, res) => {
    try {
        const correo = normalizarCorreo(req.body.correo || req.body.Correo);

        if (!correo) {
            return res.status(400).json({
                success: false,
                message: "El correo es obligatorio"
            });
        }

        const usuario = await query(
            "SELECT id FROM usuarios WHERE correo = $1 LIMIT 1",
            [correo]
        );

        if (!usuario.rows.length) {
            return res.status(404).json({
                success: false,
                message: "No existe un usuario con ese correo"
            });
        }

        const link = await admin.auth().generatePasswordResetLink(correo);

        await sendBrevoEmail({
            to: correo,
            subject: "Recuperacion de contrasena",
            html: `
                <div style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Recuperacion de contrasena</h2>
                    <p>Usa el siguiente enlace para restablecer tu contrasena:</p>
                    <p><a href="${link}">Restablecer contrasena</a></p>
                    <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
                </div>
            `
        });

        return res.status(200).json({
            success: true,
            message: "Correo de recuperacion enviado"
        });
    } catch (error) {
        return responderError(res, error, "Error al enviar correo de recuperacion");
    }
};

const restablecerContrasena = async (req, res) => {
    return res.status(410).json({
        success: false,
        message: "El restablecimiento de contrasena ahora se gestiona con Firebase Auth"
    });
};

const verificarRucDisponible = async (req, res) => {
    try {
        const ruc = normalizarTexto(req.query.ruc);

        if (!ruc || !/^\d{11}$/.test(ruc)) {
            return res.status(400).json({
                success: false,
                message: "RUC debe tener 11 digitos numericos"
            });
        }

        const tiendaExistente = await query(
            "SELECT id FROM tiendas WHERE ruc = $1 LIMIT 1",
            [ruc]
        );

        if (tiendaExistente.rows.length) {
            return res.status(409).json({
                success: false,
                message: "Ya existe una cuenta registrada con este RUC"
            });
        }

        const rucResult = await fetchRuc(ruc);

        if (!rucResult) {
            return res.status(404).json({
                success: false,
                message: "RUC no encontrado o invalido"
            });
        }

        return res.status(200).json({
            success: true,
            message: "RUC disponible para registro",
            data: {
                ruc,
                razonSocial: rucResult.razon_social || rucResult.razonSocial,
                estado: rucResult.estado
            }
        });
    } catch (error) {
        return responderError(res, error, "Error al consultar RUC");
    }
};

module.exports = {
    registrarUsuario,
    loginUsuario,
    recuperarContrasena,
    restablecerContrasena,
    cerrarSesion,
    verificarRucDisponible
};
