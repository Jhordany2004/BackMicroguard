const { z } = require("./common.validator");

const registerUserSchema = z.object({
    nombres: z.string().trim().optional(),
    Nombres: z.string().trim().optional(),
    apellidos: z.string().trim().optional(),
    Apellidos: z.string().trim().optional(),
    celular: z.string().trim().optional(),
    Celular: z.string().trim().optional(),
    ruc: z.string().trim().optional(),
    RUC: z.string().trim().optional(),
    nombreTienda: z.string().trim().optional(),
    NombreTienda: z.string().trim().optional(),
    fcmToken: z.string().trim().optional(),
    idToken: z.string().trim().optional(),
    tokenFirebase: z.string().trim().optional()
}).passthrough()
    .refine((data) => data.nombres || data.Nombres, "Nombres es obligatorio")
    .refine((data) => data.apellidos || data.Apellidos, "Apellidos es obligatorio")
    .refine((data) => data.ruc || data.RUC, "RUC es obligatorio")
    .refine((data) => data.nombreTienda || data.NombreTienda, "Nombre de tienda es obligatorio");

const loginUserSchema = z.object({
    fcmToken: z.string().trim().optional(),
    idToken: z.string().trim().optional(),
    tokenFirebase: z.string().trim().optional()
}).passthrough();

const logoutUserSchema = z.object({
    fcmToken: z.string().trim().optional()
}).passthrough();

const rucQuerySchema = z.object({
    ruc: z.string().trim().regex(/^\d{11}$/, "RUC debe tener 11 digitos numericos")
}).passthrough();

module.exports = {
    registerUserSchema,
    loginUserSchema,
    logoutUserSchema,
    rucQuerySchema
};
