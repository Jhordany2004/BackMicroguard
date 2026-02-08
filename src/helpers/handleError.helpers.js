const handleError = (res, error, options = {}) => {
    const {
        statusCode = 500,
        message = "Error interno del servidor",
        //log = true
    } = options;

    // Mongoose validation errors -> return 400 with details
    if (error && error.name === 'ValidationError' && error.errors) {
        const errors = Object.keys(error.errors).reduce((acc, key) => {
            acc[key] = error.errors[key].message || error.errors[key].reason || String(error.errors[key]);
            return acc;
        }, {});
        // if (log) console.error('Validation Error:', errors);
        return res.status(400).json({ success: false, message: 'Validation failed', errors });
    }

    // Mongoose cast errors (invalid ObjectId, etc.)
    if (error && error.name === 'CastError') {
        // if (log) console.error('Cast Error:', error.message);
        return res.status(400).json({ success: false, message: 'Invalid value for field', field: error.path });
    }

    if (log) {
        console.error(' Error:', error);
    }

    return res.status(statusCode).json({ success: false, message });
};

module.exports = { handleError };