const { badRequest, conflict } = require("./AppError");

const mapPostgresError = (error, messages = {}) => {
    if (error?.code === "23505") {
        throw conflict(messages.unique || "Ya existe un registro con esos datos");
    }

    if (error?.code === "23503") {
        throw badRequest(messages.foreignKey || "Uno de los datos relacionados no existe");
    }

    if (error?.code === "23514") {
        throw badRequest(messages.check || "Los datos no cumplen las reglas de la base de datos");
    }

    throw error;
};

module.exports = { mapPostgresError };
