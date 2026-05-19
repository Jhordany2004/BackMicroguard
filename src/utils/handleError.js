const handleError = (res, error, options = {}) => {
    const {
        statusCode = 500,
        message = "Error interno del servidor",
        log = true
    } = options;

    if (error?.name === 'ValidationError' && error.errors) {
        const errors = Object.keys(error.errors).reduce((acc, key) => {
            acc[key] =
                error.errors[key].message ||
                error.errors[key].reason ||
                "Valor inválido";
            return acc;
        }, {});
        return res.status(400).json({
            success: false,
            message: "Error de validación",
            errors
        });
    }

    if (error?.name === 'CastError') {
        return res.status(400).json({
            success: false,
            message: "Formato inválido",
            field: error.path
        });
    }

    if (error?.code === 11000) {
        const fields = Object.keys(error.keyValue || {});
        return res.status(409).json({
            success: false,
            message: "Dato duplicado",
            fields
        });
    }

    if (error?.name === 'JsonWebTokenError') {
        return res.status(401).json({
            success: false,
            message: "Token inválido"
        });
    }

    if (error?.name === 'TokenExpiredError') {
        return res.status(401).json({
            success: false,
            message: "Token expirado"
        });
    }

    if (error?.statusCode && error?.message) {
        return res.status(error.statusCode).json({
            success: false,
            message: error.message,
            ...(error.details && { errors: error.details })
        });
    }

    if (log) {
        console.error("Unhandled error:", error);
    }

    return res.status(statusCode).json({
        success: false,
        message
    });
};

module.exports = { handleError };
