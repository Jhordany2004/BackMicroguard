const Usuario = require("../models/user.model");
const Store = require("../models/store.model");
const MetodoPago = require("../models/payment.model");
const Categoria = require("../models/category.model");
const Configuracion = require("../models/config.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const nodemailer = require('nodemailer');
const crypto = require("crypto");
const fetch = require('node-fetch');
const { handleError } = require("../helpers/error.helpers");


const validarPassword = (password) => {
    if (password.length < 8) return "Mínimo 8 caracteres";
    if (!/[A-Za-z]/.test(password)) return "Debe contener una letra";
    if (!/\d/.test(password)) return "Debe contener un número";
    return null;
};

const registrarUsuario = async (req, res) => {
    try {
        const { Nombres, Apellidos, Correo, Celular, Contrasena, RUC, RazonSocial} = req.body;

        const requiredFields = {
        Nombres,
        Apellidos,
        Correo,
        Contrasena,
        RUC,
        Celular,
        RazonSocial
        };

        const camposFaltantes = Object.keys(requiredFields)
        .filter(field => !requiredFields[field]);

        if (camposFaltantes.length > 0) {
        return res.status(400).json({
            success: false,
            message: "Campos obligatorios incompletos",
            errors: camposFaltantes
        });
        }

        const nombreRegex = /^[A-Za-zÑñÁÉÍÓÚáéíóú\s]+$/;
        const correoRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!nombreRegex.test(Nombres) || !nombreRegex.test(Apellidos)) {
            return res.status(400).json({
                success: false, message: "El campo para nombres y/o apellidos solo deben contener letras y espacios",
            });
        }
        if (!correoRegex.test(Correo)) {
            return res.status(400).json({ success: false, message: "El correo no es válido" });
        }

        const errorPassword = validarPassword(Contrasena);
        if (errorPassword) {
            return res.status(400).json({ success: false, message: errorPassword });
        }

        const usuarioExistente = await Usuario.findOne({
            $or: [{ Correo }, { Celular }],
        });

        if (usuarioExistente) {
            const errors = [];

            if (usuarioExistente.Correo === Correo) {
                errors.push("Correo");
            }

            if (usuarioExistente.Celular === Celular) {
                errors.push("Celular");
            }

            return res.status(409).json({
                success: false,
                message: "Estos datos ya estan en uso",
                errors
            });
        }

        const storeExistente = await Store.findOne({ RUC });
        if (storeExistente) {
            return res.status(409).json({ success: false, message: "Ya existe una tienda con ese RUC" });
        }

        

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Contrasena, salt);

        const nuevoUsuario = new Usuario({
            Nombres,
            Apellidos,
            Correo,
            Celular,
            Contrasena: hashedPassword,
            fcmTokens: []         
        });
        await nuevoUsuario.save();

        const nuevoStore = new Store({
            Usuario: nuevoUsuario._id,
            RUC,
            RazonSocial,
        });
        await nuevoStore.save();

        const nuevaConfig = new Configuracion({
            stockminimo: "50",
            diasAlertaVencimiento: "7",            
            Tienda: nuevoStore._id,
        });
        await nuevaConfig.save();

        const metodos = [
            { nombre: "Efectivo", estado: true },
            { nombre: "Yape", estado: true },
            { nombre: "Plin", estado: true },
            { nombre: "Transferencia", estado: false }
        ];

        const erroresMetodos = [];        
        for (const metodo of metodos) {
            try {
                const nuevoMetodo = new MetodoPago({
                    nombre: metodo.nombre,
                    estado: metodo.estado,
                    Tienda: nuevoStore._id,
                });
                await nuevoMetodo.save();                
            } catch (error) {                
                console.error(`Error creando método: ${metodo.nombre}`, error.message);
                erroresMetodos.push(metodo.nombre);
            }
        }

        const mensajeMetodos =
        erroresMetodos.length === 0
            ? "Todos los métodos de pago fueron creados correctamente"
            : `No se pudieron crear: ${erroresMetodos.join(", ")}`;

        const categorias = [
            { nombre: "Abarrotes", descripcion: "Productos de primera necesidad y alimentos básicos" },
            { nombre: "Bebidas", descripcion: "Todo tipo de bebidas, gaseosas, jugos y agua" },
            { nombre: "Limpieza", descripcion: "Productos para limpieza y aseo" },
            { nombre: "Snacks", descripcion: "Productos para picar y snacks" },
            { nombre: "Otros", descripcion: "Categoría para productos varios" }
        ];

        const erroresCategorias = [];
        for (const categoria of categorias) {
            try {
                const nuevaCategoria = new Categoria({
                    nombre: categoria.nombre,
                    descripcion: categoria.descripcion,
                    Tienda: nuevoStore._id,
                });
                await nuevaCategoria.save();                
            } catch (error) {
                console.error(`Error creando categoría: ${categoria.nombre}`, error.message);
                erroresCategorias.push(categoria.nombre);
            }
        }

        const mensajeCategorias =
            erroresCategorias.length === 0
                ? "Todas las categorías fueron creadas correctamente"
                : `No se pudieron crear: ${erroresCategorias.join(", ")}`;

        return res.status(201).json({
            success: true,
            message: "Usuario y tienda registrados correctamente",
            metodosPago: mensajeMetodos,
            categorias: mensajeCategorias,
            usuario: {
                Nombres: nuevoUsuario.Nombres,
                Apellidos: nuevoUsuario.Apellidos,
                Correo: nuevoUsuario.Correo,
            },
            tienda: {
                RUC: nuevoStore.RUC,
                RazonSocial: nuevoStore.RazonSocial,
            },
        });
    } catch (error) {             
        return handleError(res, error, {
            message: "Error al registrar usuario",
        });
    }
};

const loginUsuario = async (req, res) => {
    try {
        const { Correo, Contrasena, fcmToken } = req.body;

        if (!Correo || !Contrasena) {
            return res
                .status(400)
                .json({ success: false, message: "Correo y contraseña son obligatorios" });
        }
        
        if (!fcmToken) {
            return res
                .status(400)
                .json({ success: false, message: "TokenFCM no proporcionado" });
        }

        const estado = await Usuario.findOne({ estado: true, Correo });
        if (!estado) {
            return res
                .status(403)
                .json({ success: false, message: "El usuario está inhabilitado, contacte con soporte" });
        }

        const usuario = await Usuario.findOne({ Correo });
        if (!usuario) {
            return res
                .status(400)
                .json({ success: false, message: "Correo incorrecto" });
        }

        const esValida = await bcrypt.compare(Contrasena, usuario.Contrasena);
        if (!esValida) {
            return res
                .status(401)
                .json({ success: false, message: "Contraseña incorrecta" });
        }

        // Guardar el token FCM si se envía y no está repetido/registrado
        if (fcmToken) {
            await Usuario.findByIdAndUpdate(
                usuario._id,
                { $addToSet: { fcmTokens: fcmToken } } 
            );
        }

        const tienda = await Store.findOne({ Usuario: usuario._id });

        const usuarios = {
            _id: usuario._id,
            Nombres: usuario.Nombres,
            Apellidos: usuario.Apellidos,
            RUC: tienda.RUC,
            RazonSocial: tienda.RazonSocial
        };

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET no definido");
        }

        const token = jwt.sign(
        { id: usuario._id },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
        );


        res.status(200).json({
            success: true,
            message: "Se ha iniciado sesión exitosamente",
            token,
            data: usuarios,
        });
    } catch (error) {
        return handleError(res, error, {
            message: "Error al iniciar sesión",
        });
    }
};

const recuperarContraseña = async (req, res) => {
    const { Correo } = req.body;

    try {
        const usuario = await Usuario.findOne({ Correo });
        if (!usuario)
            return res.status(404).json({ success: false, message: "No existe un usuario con ese correo" });

        const Codigo = Math.floor(100000 + Math.random() * 900000).toString();

        const hashCodigo = crypto
            .createHash("sha256")
            .update(Codigo)
            .digest("hex");
        
        usuario.codigoRecuperacion = hashCodigo;
        usuario.codigoExpiracion = Date.now() + 15 * 60 * 1000;


        await usuario.save();

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
                user: process.env.GMAIL_USER,
                pass: process.env.GMAIL_PASS
            }
        });

        const htmlCorreo = `
            <div style="font-family: Arial, sans-serif; background-color: #f4f6f8; padding: 20px;">
                <div style="max-width: 500px; margin: auto; background-color: #ffffff; border-radius: 8px; padding: 24px;">
                
                <h2 style="color: #333;">🔐 Recuperación de contraseña</h2>

                <p style="color: #555; font-size: 15px;">
                    Hemos recibido una solicitud para restablecer tu contraseña en <strong>Microguard</strong>.
                </p>

                <p style="color: #555; font-size: 15px;">
                    Usa el siguiente código para continuar con el proceso:
                </p>

                <div style="
                    font-size: 28px;
                    font-weight: bold;
                    letter-spacing: 6px;
                    text-align: center;
                    margin: 20px 0;
                    color: #1a73e8;
                ">
                    ${Codigo}
                </div>

                <p style="color: #555; font-size: 14px;">
                    ⏱ Este código expirará en <strong>15 minutos</strong>.
                </p>

                <p style="color: #777; font-size: 13px;">
                    Si no solicitaste este cambio, puedes ignorar este correo. Tu cuenta seguirá segura.
                </p>

                <hr style="margin: 24px 0; border: none; border-top: 1px solid #eee;">

                <p style="color: #999; font-size: 12px;">
                    © ${new Date().getFullYear()} Microguard — Equipo de Soporte
                </p>
                </div>
            </div>
            `;

        await transporter.sendMail({
                from: `"Soporte Microguard" <${process.env.GMAIL_USER}>`,
                to: Correo,
                subject: "Recuperación de contraseña",
                html: htmlCorreo,                
            });       

        return res.status(200).json({ success: true, message: "Correo de recuperación enviado" });

    } catch (error) {        
        return handleError(res, error, {
            message: "Error al enviar correo de recuperación",
        });
    }
};

const cerrarSesion = async (req, res) => {
    try {
        return res.status(200).json({ success: true, message: "Sesión cerrada exitosamente" });
    } catch (error) {
        return handleError(res, error, {
            message: "Error al cerrar sesión",
        });
    }
};

const restablecerContraseña = async (req, res) => {
    const { nuevaContrasena, Codigo, Correo } = req.body;

    try {
        const usuario = await Usuario.findOne({ Correo });
        if (!usuario) {
        return res.status(404).json({ success: false, message: "Usuario no encontrado" });
        }

        if (!/^\d{6}$/.test(Codigo)) {
        return res.status(400).json({
            success: false,
            message: "El código debe tener 6 dígitos",
        });
        }

        const errorPassword = validarPassword(nuevaContrasena);
        if (errorPassword) {
            return res.status(400).json({ success: false, message: errorPassword });
        }

        
        const hashCodigo = crypto
        .createHash("sha256")
        .update(Codigo)
        .digest("hex");

        if (
            usuario.codigoRecuperacion !== hashCodigo ||
            Date.now() > usuario.codigoExpiracion
            ) {
        return res.status(400).json({
            success: false,
            message: "Código inválido o expirado",
        });
        }

        const hashPassword = await bcrypt.hash(nuevaContrasena, 10);

        usuario.Contrasena = hashPassword;
        usuario.codigoRecuperacion = null;
        usuario.codigoExpiracion = null;

        await usuario.save();

        return res.status(200).json({
        success: true,
        message: "Contraseña actualizada correctamente",
        });

    } catch (error) {       
        return handleError(res, error, {
            message: "Error al restablecer la contraseña",
        });
    }
};

const verificarRuc = async (req, res) => {
    const { ruc } = req.query;
    if (!ruc || !/^\d{11}$/.test(ruc)) {
        return res.status(400).json({ message: 'RUC debe tener 11 dígitos numéricos' });
    }
    try {
        const response = await fetch(`https://consultaruc.win/api/ruc/${ruc}`);
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(502).json({ success: false, message: 'Error al consultar el RUC. Respuesta inválida del proveedor.' });
        }
        const data = await response.json();
        if (data && data.result && data.result.estado) {
            return res.status(200).json({
                success: true,
                estado: data.result.estado,
                RazonSocial: data.result.razon_social
            });
        } else {
            return res.status(404).json({ success: false, message: 'RUC no encontrado o inválido' });
        }
    } catch (error) {
        return handleError(res, error, {
            statusCode: 502,
            message: "Error al consultar el proveedor externo RUC",
        });
    }
};

const verificarDNI = async (req, res) => {
    const { dni } = req.query;
    if (!dni || !/^\d{8}$/.test(dni)) {
        return res.status(400).json({ message: 'DNI debe tener 8 dígitos numéricos' });
    }
    try {
        const apiKey = process.env.API_KEY;
        const url = `https://dniruc.apisperu.com/api/v1/dni/${dni}?token=${apiKey}`;
        const response = await fetch(url);
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(502).json({ message: 'Error al consultar el DNI. Respuesta inválida del proveedor.' });
        }
        const data = await response.json();

        if (data && data.success) {
            const nombreCompleto = `${data.nombres} ${data.apellidoPaterno} ${data.apellidoMaterno}`;
            return res.status(200).json({
                success: true,
                estado: data.success,                
                nombreCompleto: nombreCompleto
            });
        } else {
            return res.status(404).json({ success: false, message: 'DNI no encontrado o inválido' });
        }
    } catch (error) {
        return handleError(res, error, {
            statusCode: 502,
            message: "Error al consultar el proveedor externo DNI",
        });
    }
};

//Exportacion de modulos
module.exports = {
    registrarUsuario,
    loginUsuario,
    recuperarContraseña,
    restablecerContraseña,
    cerrarSesion,
    verificarRuc,
    verificarDNI,
};
