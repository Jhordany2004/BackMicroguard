const { handleError } = require("../utils/handleError");

const notFoundHandler = (req, res) => {
    return res.status(404).json({
        success: false,
        message: "Ruta no encontrada"
    });
};

const errorHandler = (error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    return handleError(res, error);
};

module.exports = {
    notFoundHandler,
    errorHandler
};
