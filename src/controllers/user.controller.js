const Usuario = require("../models/user.model");
const Store = require("../models/store.model");
const MetodoPago = require("../models/payment.model");
const Categoria = require("../models/category.model");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const nodemailer = require('nodemailer');
require('dotenv').config(); 
const fetch = require('node-fetch');


const registrarUsuario = async (req, res) => {
    try {
        const { Nombres, Apellidos, Correo, Celular, Contrasena, RUC, RazonSocial } = req.body;

        if (!Nombres || !Apellidos || !Correo || !Contrasena || !RUC || !Celular || !RazonSocial) {
            console.log("El usuario no ha llenado todos los campos obligatorios");
            return res.status(400).json({
                message: 
                "Los campos para nombres, apellidos, correo, contraseña, celular, ruc y RazonSocial son obligatorios",
            });
        }

        const nombreRegex = /^[A-Za-zÑñÁÉÍÓÚáéíóú\s]+$/;
        const correoRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

        if (!nombreRegex.test(Nombres) || !nombreRegex.test(Apellidos)) {
            return res.status(400).json({
                message: "El campo para nombres y/o apellidos solo deben contener letras y espacios",
            });
        }
        if (!correoRegex.test(Correo)) {
            return res.status(400).json({ message: "El correo no es válido" });
        }

        const usuarioExistente = await Usuario.findOne({
            $or: [{ Correo }, { Celular }],
        });
        if (usuarioExistente) {
            return res.status(409).json({ message: "El correo o celular ya están registrados" });
        }

        const storeExistente = await Store.findOne({ RUC });
        if (storeExistente) {
            return res.status(409).json({ message: "Ya existe una tienda con ese RUC" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(Contrasena, salt);

        const nuevoUsuario = new Usuario({
            Nombres,
            Apellidos,
            Correo,
            Celular,
            Contrasena: hashedPassword,
        });
        await nuevoUsuario.save();

        const nuevoStore = new Store({
            Usuario: nuevoUsuario._id,
            RUC,
            RazonSocial,
        });
        await nuevoStore.save();

        const metodos = [
            { nombre: "Efectivo", estado: true },
            { nombre: "Yape", estado: true },
            { nombre: "Plin", estado: true },
            { nombre: "Transferencia", estado: false }
        ];

        let metodosCreados = 0;
        for (const metodo of metodos) {
            try {
                const nuevoMetodo = new MetodoPago({
                    nombre: metodo.nombre,
                    estado: metodo.estado,
                    Tienda: nuevoStore._id,
                });
                await nuevoMetodo.save();
                metodosCreados++;
            } catch (error) {
                console.log(`No se pudo crear el método de pago ${metodo.nombre}: ${error.message}`);
            }
        }

        const mensajeMetodos = metodosCreados === metodos.length
            ? "Todos los métodos de pago fueron creados correctamente"
            : `Se crearon ${metodosCreados} de ${metodos.length} métodos de pago`;

        const categorias = [
            { nombre: "Abarrotes", descripcion: "Productos de primera necesidad y alimentos básicos" },
            { nombre: "Bebidas", descripcion: "Todo tipo de bebidas, gaseosas, jugos y agua" },
            { nombre: "Limpieza", descripcion: "Productos para limpieza y aseo" },
            { nombre: "Snacks", descripcion: "Productos para picar y snacks" },
            { nombre: "Otros", descripcion: "Categoría para productos varios" }
        ];

        let categoriasCreadas = 0;
        for (const categoria of categorias) {
            try {
                const nuevaCategoria = new Categoria({
                    nombre: categoria.nombre,
                    descripcion: categoria.descripcion,
                    Tienda: nuevoStore._id,
                });
                await nuevaCategoria.save();
                categoriasCreadas++;
            } catch (error) {
                console.log(`No se pudo crear la categoría ${categoria.nombre}: ${error.message}`);
            }
        }

        const mensajeCategorias = categoriasCreadas === categorias.length
            ? "Todas las categorías fueron creadas correctamente"
            : `Se crearon ${categoriasCreadas} de ${categorias.length} categorías`;

        return res.status(201).json({
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
        const errorMessage = error.message || "Error al registrar usuario";
        console.log("Error Back-End: ", errorMessage);
        res.status(500).json({ message: errorMessage });
    }
};

//Login usuario
const loginUsuario = async (req, res) => {
    try {
        const { Correo, Contrasena } = req.body;

        if (!Correo || !Contrasena) {
        return res
            .status(400)
            .json({ message: "Correo y contraseña son obligatorios" });
        }

        const estado = await Usuario.findOne({estado: true });
        if (!estado) {
            return res
                .status(403)
                .json({ message: "El usuario está inhabilitado, contacte con soporte" });
        }

        const usuario = await Usuario.findOne({ Correo });
        if (!usuario) {
        return res
            .status(400)
            .json({ message: "Correo o contraseña incorrectos" });
        }

        const esValida = await bcrypt.compare(Contrasena, usuario.Contrasena);
        if (!esValida) {
        return res
            .status(401)
            .json({ message: "Correo o contraseña incorrectos" });
        }

        const tienda = await Store.findOne({ Usuario: usuario._id });

        const usuarios = {
            _id: usuario._id,
            Nombres: usuario.Nombres,
            Apellidos: usuario.Apellidos,
            RUC: tienda.RUC,
            RazonSocial: tienda.RazonSocial
        };

        const token = jwt.sign(
        {
            id: usuario._id,
            correo: usuario.Correo,
        },
        process.env.JWT_SECRET || "Secret",
        {
            expiresIn: "7d",
        }
        );

        res.status(200).json({
        message: "Se ha iniciado sesión exitosamente",
        token,
        usuario: usuarios,
        });
    } catch (error) {
        const errorMessage = error.message || "Error iniciando sesión";
        console.log("Error Back-End: ", errorMessage);
        res.status(500).json({ message: errorMessage });
    }
};

//Recuperar Contraseña
const recuperarContraseña = async (req, res) => {
    const { Correo } = req.body;

    try {
        const usuario = await Usuario.findOne({ Correo });
        if (!usuario)
            return res.status(404).json({ message: "Correo incorrecto" });

        const Codigo = Math.floor(1000 + Math.random() * 9000).toString();

        usuario.codigoRecuperacion = Codigo;
        usuario.codigoExpiracion = Date.now() + 15 * 60 * 1000;

        await usuario.save();

        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS,},
        });

        await transporter.sendMail({
                from: '"Soporte Microguard" <no-reply@example.com>',
                to: Correo,
                subject: "Recuperación de contraseña",
                html: `<p>Utiliza este código de 4 dígitos para reestablecer tu contraseña: 
                <strong>${Codigo}</strong></p>`,
            });       

        res.status(200).json({ message: "Correo de recuperación enviado" });

    } catch (error) {
        console.error("Error al recuperar la contraseña:", error);
        return res.status(500).json({ message: "Hubo un error al procesar la solicitud", error: error.message });
    }
};

//Cerrar sesion
const cerrarSesion = async (req, res) => {
    try {
        return res.status(200).json({ message: "Sesión cerrada exitosamente" });
    } catch (error) {
        const errorMessage = error.message || "Error al cerrar sesión";
        console.log("Error Back-End: ", errorMessage);
        res.status(500).json({ message: errorMessage });
    }
};

//Restasblecer Contraseña
const restablecerContraseña = async (req, res) => {
    const { nuevaContrasena, Codigo, Correo } = req.body;

    const usuario = await Usuario.findOne({ Correo });
    if (!usuario)
        return res.status(404).json({ message: "Usuario no encontrado" });

    if (
        usuario.codigoRecuperacion !== Codigo ||
        Date.now() > usuario.codigoExpiracion
    ) {
        return res.status(400).json({ message: "Código inválido o expirado" });
    }

    const hash = await bcrypt.hash(nuevaContrasena, 10);
    usuario.Contrasena = hash;
    usuario.codigoRecuperacion = null;
    usuario.codigoExpiracion = null;
    await usuario.save();

    res.status(200).json({ message: "Contraseña actualizada correctamente" });
};

//VerificarRuc
const verificarRuc = async (req, res) => {
    const { ruc } = req.body;
    if (!ruc) {
        return res.status(400).json({ message: 'RUC es requerido' });
    }
    console.log("El RUC a consultar es:", ruc);
    
    try {
        const response = await fetch(`https://consultaruc.win/api/ruc/${ruc}`);
        const data = await response.json();
        if (data && data.result && data.result.estado) {
        return res.json({ estado: data.result.estado});
        } else {
        return res.status(404).json({ message: 'RUC no encontrado' });
        }
    } catch (error) {
        return res.status(500).json({ message: 'Error al consultar el RUC', error: error.message });
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
};
