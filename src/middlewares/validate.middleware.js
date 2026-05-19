const { ZodError } = require("zod");

const formatZodErrors = (error) => {
    return error.issues.reduce((acc, issue) => {
        const path = issue.path.length ? issue.path.join(".") : "request";
        acc[path] = issue.message;
        return acc;
    }, {});
};

const validateSchema = (schemas = {}) => (req, res, next) => {
    try {
        for (const [segment, schema] of Object.entries(schemas)) {
            if (!schema) continue;

            const result = schema.safeParse(req[segment]);

            if (!result.success) {
                return res.status(400).json({
                    success: false,
                    message: "Error de validacion",
                    errors: formatZodErrors(result.error)
                });
            }
        }

        return next();
    } catch (error) {
        if (error instanceof ZodError) {
            return res.status(400).json({
                success: false,
                message: "Error de validacion",
                errors: formatZodErrors(error)
            });
        }

        return next(error);
    }
};

module.exports = { validateSchema };
