class AppError extends Error {
    constructor(message, statusCode = 500, details = null) {
        super(message);
        this.name = "AppError";
        this.statusCode = statusCode;
        this.details = details;
        Error.captureStackTrace(this, this.constructor);
    }
}

const badRequest = (message, details = null) => new AppError(message, 400, details);
const unauthorized = (message = "No autorizado") => new AppError(message, 401);
const forbidden = (message = "Acceso denegado") => new AppError(message, 403);
const notFound = (message = "Recurso no encontrado") => new AppError(message, 404);
const conflict = (message = "Conflicto con el estado actual del recurso") => new AppError(message, 409);

module.exports = {
    AppError,
    badRequest,
    unauthorized,
    forbidden,
    notFound,
    conflict
};
