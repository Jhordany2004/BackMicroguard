const success = (res, {
    statusCode = 200,
    message = "Operación exitosa",
    data = null
}) => {
    return res.status(statusCode).json({
        success: true,
        message,
        ...(data && { data })
    });
};

const created = (res, {
    message = "Recurso creado correctamente",
    data = null
}) => {
    return res.status(201).json({
        success: true,
        message,
        ...(data && { data })
    });
};

module.exports = { success, created };