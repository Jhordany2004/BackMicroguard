const admin = require("../config/firebase");
const userRepository = require("../repositories/user.repository");
const { verifyRuc } = require("./externalLookup.service");
const { badRequest, conflict, forbidden, unauthorized } = require("../utils/AppError");
const { normalizeText } = require("../utils/validators");
const { withTransaction } = require("../utils/transaction");
const { mapPostgresError } = require("../utils/postgresError");

const initialCategories = [
    { nombre: "Abarrotes", descripcion: "Productos de primera necesidad" },
    { nombre: "Bebidas", descripcion: "Todo tipo de bebidas" },
    { nombre: "Limpieza", descripcion: "Productos de limpieza" },
    { nombre: "Snacks", descripcion: "Productos para picar" },
    { nombre: "Otros", descripcion: "Productos varios" }
];

const initialPaymentMethods = [
    { nombre: "Efectivo", estado: true },
    { nombre: "Yape", estado: true },
    { nombre: "Plin", estado: true },
    { nombre: "Transferencia", estado: false }
];

const normalizeEmail = (value) => normalizeText(value).toLowerCase();

const getFirebaseToken = (req) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.slice(7);
    }

    return req.body.idToken || req.body.tokenFirebase || null;
};

const verifyFirebaseToken = async (req) => {
    const token = getFirebaseToken(req);

    if (!token) {
        throw unauthorized("Token de Firebase no proporcionado");
    }

    return admin.auth().verifyIdToken(token);
};

const formatUser = (user, store = null) => ({
    id: Number(user.id),
    firebaseUid: user.firebase_uid,
    nombres: user.nombres,
    apellidos: user.apellidos,
    correo: user.correo,
    celular: user.celular,
    rol: user.rol,
    estado: user.estado,
    tienda: store ? {
        id: Number(store.id),
        ruc: store.ruc,
        nombre: store.nombre,
        razonSocial: store.razon_social
    } : null
});

const normalizeRegistrationBody = (body) => ({
    nombres: normalizeText(body.nombres || body.Nombres),
    apellidos: normalizeText(body.apellidos || body.Apellidos),
    celular: normalizeText(body.celular || body.Celular),
    ruc: normalizeText(body.ruc || body.RUC),
    nombreTienda: normalizeText(body.nombreTienda || body.NombreTienda),
    fcmToken: normalizeText(body.fcmToken)
});

const validateRegistration = ({ firebaseUser, body, correo }) => {
    if (!firebaseUser.uid || !correo) {
        throw badRequest("El token de Firebase debe incluir uid y correo");
    }

    if (!body.nombres || !body.apellidos || !body.ruc || !body.nombreTienda) {
        throw badRequest("Nombres, apellidos, RUC y nombre de tienda son obligatorios");
    }

    if (!/^\d{11}$/.test(body.ruc)) {
        throw badRequest("El RUC debe tener 11 digitos numericos");
    }

    if (body.celular && !/^\d{9}$/.test(body.celular)) {
        throw badRequest("El celular debe tener 9 digitos numericos");
    }
};

const registerUser = async (req) => {
    const firebaseUser = await verifyFirebaseToken(req);
    const body = normalizeRegistrationBody(req.body);
    const correo = normalizeEmail(firebaseUser.email);

    validateRegistration({ firebaseUser, body, correo });

    const rucResult = await verifyRuc(body.ruc);
    const razonSocial = rucResult?.razonSocial || rucResult?.razon_social;

    if (!razonSocial) {
        throw badRequest("No se pudo obtener la razon social del RUC");
    }

    try {
        return await withTransaction(async (client) => {
            const existingUser = await userRepository.findByFirebaseUidOrEmail(client, firebaseUser.uid, correo);

            if (existingUser) {
                throw conflict("El usuario ya esta registrado");
            }

            const existingStore = await userRepository.findStoreByRuc(client, body.ruc);

            if (existingStore) {
                throw conflict("Ya existe una tienda con ese RUC");
            }

            const store = await userRepository.createStore(client, {
                ruc: body.ruc,
                nombre: body.nombreTienda,
                razonSocial
            });

            const user = await userRepository.createUser(client, {
                tiendaId: store.id,
                firebaseUid: firebaseUser.uid,
                nombres: body.nombres,
                apellidos: body.apellidos,
                correo,
                celular: body.celular
            });

            await userRepository.createGeneralCustomer(client, store.id);

            for (const method of initialPaymentMethods) {
                await userRepository.createPaymentMethod(client, store.id, method);
            }

            for (const category of initialCategories) {
                await userRepository.createCategory(client, store.id, category);
            }

            await userRepository.saveFcmToken(client, user.id, body.fcmToken);

            return {
                usuario: formatUser(user, store)
            };
        });
    } catch (error) {
        mapPostgresError(error, {
            unique: "Ya existe un registro con esos datos"
        });
    }
};

const loginUser = async (req) => {
    const firebaseUser = await verifyFirebaseToken(req);
    const fcmToken = normalizeText(req.body.fcmToken);

    return withTransaction(async (client) => {
        const row = await userRepository.findSessionByFirebaseUid(client, firebaseUser.uid);

        if (!row) {
            return {
                requiereRegistro: true,
                firebase: {
                    uid: firebaseUser.uid,
                    correo: firebaseUser.email || null
                }
            };
        }

        if (!row.estado) {
            throw forbidden("Usuario inhabilitado");
        }

        await userRepository.saveFcmToken(client, row.id, fcmToken);

        return {
            requiereRegistro: false,
            usuario: formatUser(row, {
                id: row.tienda_id_real,
                ruc: row.ruc,
                nombre: row.nombre,
                razon_social: row.razon_social
            })
        };
    });
};

const logoutUser = async ({ usuarioId, fcmToken }) => {
    const token = normalizeText(fcmToken);

    if (!token) return;

    await withTransaction(async (client) => {
        await userRepository.deleteFcmToken(client, usuarioId, token);
    });
};

const verifyAvailableRuc = async (rucValue) => {
    const ruc = normalizeText(rucValue);

    if (!ruc || !/^\d{11}$/.test(ruc)) {
        throw badRequest("RUC debe tener 11 digitos numericos");
    }

    return withTransaction(async (client) => {
        const existingStore = await userRepository.findStoreByRuc(client, ruc);

        if (existingStore) {
            throw conflict("Ya existe una cuenta registrada con este RUC");
        }

        const rucResult = await verifyRuc(ruc);

        return {
            ruc,
            razonSocial: rucResult.razonSocial || rucResult.razon_social,
            estado: rucResult.estado
        };
    });
};

module.exports = {
    registerUser,
    loginUser,
    logoutUser,
    verifyAvailableRuc
};
