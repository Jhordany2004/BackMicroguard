const handleError = (res, error, options = {}) => {
    const {
        statusCode = 500,
        message = "Error interno del servidor",
        log = true,
    } = options;

    if (log) {
        console.error(" Error:", error);
    }

    return res.status(statusCode).json({
        success: false,
        message,
    });
};

module.exports = { handleError };