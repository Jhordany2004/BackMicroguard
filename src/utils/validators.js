const { badRequest, forbidden } = require("./AppError");

const normalizeText = (value) => (typeof value === "string" ? value.trim() : "");
const normalizeUpper = (value) => normalizeText(value).toUpperCase();

const toNumber = (value, fallback = null) => {
    if (value === null || value === undefined || value === "") return fallback;

    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
};

const toPositiveInteger = (value, field = "id") => {
    const number = Number(value);

    if (!Number.isInteger(number) || number <= 0) {
        throw badRequest(`${field} invalido`);
    }

    return number;
};

const toBoolean = (value, field = "estado") => {
    if (typeof value !== "boolean") {
        throw badRequest(`Debe enviar el campo ${field} como booleano`);
    }

    return value;
};

const requireStore = (req) => {
    if (!req.idTienda) {
        throw forbidden("Usuario sin tienda asociada");
    }

    return req.idTienda;
};

const requireUserContext = (req) => {
    const tiendaId = requireStore(req);

    if (!req.usuarioId) {
        throw forbidden("Usuario sin tienda asociada");
    }

    return {
        tiendaId,
        usuarioId: req.usuarioId
    };
};

module.exports = {
    normalizeText,
    normalizeUpper,
    toNumber,
    toPositiveInteger,
    toBoolean,
    requireStore,
    requireUserContext
};
