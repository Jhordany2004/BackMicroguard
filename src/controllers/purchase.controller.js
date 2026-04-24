const crypto = require("crypto");
const Compra = require("../models/purchase.model");
const Proveedor = require("../models/supplier.model");
const Producto = require("../models/product.model");
const LoteProducto = require("../models/batch.model");
const Tienda = require("../models/store.model");
const Categoria = require("../models/category.model");
const { handleError } = require("../utils/handleError");


const MEDIDAS_VALIDAS = ["lt", "ml", "g", "kg", "kl"];
const MAXIMO_DIAS_ANTIGUEDAD = 1;

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";
const normalizarMedida = (medida) => normalizarTexto(medida).toLowerCase();
const normalizarNombre = (nombre) => normalizarTexto(nombre).replace(/\s+/g, " ");
const convertirNumero = (valor) => Number(valor);
const generarCodigoInterno = () => `INT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

const generarClaveProducto = ({ nombre, categoriaId, cantidadmedida, medida }) => ({
    nombre: normalizarNombre(nombre),
    Categoria: categoriaId,
    cantidadmedida,
    medida
});

const abortarSesion = async (session) => {
    if (!session) {
        return;
    }

    await session.abortTransaction();
    session.endSession();
};

const validarFechaIngreso = (fechaIngreso, indice) => {
    const fecha = fechaIngreso ? new Date(fechaIngreso) : new Date();

    if (Number.isNaN(fecha.getTime())) {
        return { error: `La fecha de ingreso del detalle #${indice} no es válida` };
    }

    const hoy = new Date();
    const hoyInicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const fechaInicio = new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate());
    const diferenciaDias = Math.floor((hoyInicio - fechaInicio) / (1000 * 60 * 60 * 24));

    if (fechaInicio > hoyInicio) {
        return { error: `La fecha de ingreso del detalle #${indice} no puede ser futura` };
    }

    if (diferenciaDias > MAXIMO_DIAS_ANTIGUEDAD) {
        return { error: `La fecha de ingreso del detalle #${indice} no puede superar ${MAXIMO_DIAS_ANTIGUEDAD} días de antigüedad` };
    }

    return { fecha };
};

const validarDetalleCompra = (detalle, indice) => {
    const nombre = normalizarNombre(detalle.NombreProducto);
    const codigoBarras = normalizarTexto(detalle.CodigoBarras);
    const medida = normalizarMedida(detalle.Medida);
    const cantidadMedida = convertirNumero(detalle.CantidadMedida);
    const cantidadComprada = convertirNumero(detalle.CantidadComprada);
    const precioCompraUnidad = convertirNumero(detalle.PrecioCompraUnidad);
    const precioVentaUnidad = convertirNumero(detalle.PrecioVentaUnidad);
    const perecible = Boolean(detalle.Perecible);
    const categoriaId = detalle.IdCategoria;
    const productoId = detalle.ProductoId || detalle.productoId || null;

    if (!nombre) {
        return { error: `El nombre del producto es obligatorio en el detalle #${indice}` };
    }

    if (!categoriaId) {
        return { error: `La categoría es obligatoria en el detalle #${indice}` };
    }

    const tieneMedida = Boolean(medida);
    const tieneCantidadMedida = Number.isFinite(cantidadMedida) && cantidadMedida > 0;

    if (tieneMedida !== tieneCantidadMedida) {
        return {
            error: `El detalle #${indice} debe enviar cantidad y unidad de medida juntas, o dejar ambas vacias`
        };
    }

    if (tieneMedida && !MEDIDAS_VALIDAS.includes(medida)) {
        return { error: `La medida del detalle #${indice} debe ser una de: ${MEDIDAS_VALIDAS.join(", ")}` };
    }

    if (!Number.isFinite(cantidadComprada) || cantidadComprada <= 0) {
        return { error: `La cantidad comprada debe ser mayor a 0 en el detalle #${indice}` };
    }

    if (!Number.isFinite(precioCompraUnidad) || precioCompraUnidad <= 0) {
        return { error: `El precio de compra por unidad debe ser mayor a 0 en el detalle #${indice}` };
    }

    if (!Number.isFinite(precioVentaUnidad) || precioVentaUnidad <= 0) {
        return { error: `El precio de venta por unidad debe ser mayor a 0 en el detalle #${indice}` };
    }

    const fechaIngresoValidada = validarFechaIngreso(detalle.FechaIngreso, indice);
    if (fechaIngresoValidada.error) {
        return fechaIngresoValidada;
    }

    let fechaVencimiento = null;
    if (detalle.FechaVencimiento) {
        fechaVencimiento = new Date(detalle.FechaVencimiento);
        if (Number.isNaN(fechaVencimiento.getTime())) {
            return { error: `La fecha de vencimiento del detalle #${indice} no es válida` };
        }
    }

    if (perecible && !fechaVencimiento) {
        return { error: `El detalle #${indice} es perecible y requiere fecha de vencimiento` };
    }

    if (fechaVencimiento && fechaVencimiento < fechaIngresoValidada.fecha) {
        return { error: `La fecha de vencimiento del detalle #${indice} no puede ser menor a la fecha de ingreso` };
    }

    return {
        data: {
            productoId,
            nombre,
            codigoBarras,
            cantidadMedida: tieneCantidadMedida ? cantidadMedida : undefined,
            medida: tieneMedida ? medida : undefined,
            perecible,
            categoriaId,
            cantidadComprada,
            precioCompraUnidad,
            precioVentaUnidad,
            imagen: normalizarTexto(detalle.Imagen) || process.env.URL_PRODUCTO_PREDETERMINADO,
            fechaIngreso: fechaIngresoValidada.fecha,
            fechaVencimiento
        }
    };
};

const buscarProductoExistente = async ({ tiendaId, detalle, session }) => {
    if (detalle.productoId) {
        return Producto.findOne({
            _id: detalle.productoId,
            Tienda: tiendaId,
            estado: true
        }).session(session);
    }

    if (detalle.codigoBarras) {
        const productoPorCodigo = await Producto.findOne({
            Tienda: tiendaId,
            codigoBarras: detalle.codigoBarras,
            estado: true
        }).session(session);

        if (productoPorCodigo) {
            return productoPorCodigo;
        }
    }

    return Producto.findOne({
        Tienda: tiendaId,
        estado: true,
        ...generarClaveProducto({
            nombre: detalle.nombre,
            categoriaId: detalle.categoriaId,
            cantidadmedida: detalle.cantidadMedida,
            medida: detalle.medida
        })
    }).session(session);
};

const validarCompatibilidadProducto = (producto, detalle, indice) => {
    if (detalle.codigoBarras && producto.codigoBarras && producto.codigoBarras !== detalle.codigoBarras) {
        return `El código de barras del detalle #${indice} no coincide con el producto existente`;
    }

    if (producto.Categoria.toString() !== detalle.categoriaId.toString()) {
        return `La categoría del detalle #${indice} no coincide con el producto existente`;
    }

    if (producto.cantidadmedida !== detalle.cantidadMedida || producto.medida !== detalle.medida) {
        return `La presentación del detalle #${indice} no coincide con el producto existente`;
    }

    return null;
};

const registrarCompra = async (req, res) => {
    let session = null;

    try {
        const { proveedor, Proveedor: proveedorLegacy, detalles, fechaRegistro } = req.body;
        const proveedorId = proveedor || proveedorLegacy;

        if (!proveedorId || !Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({ success: false, message: "Proveedor y detalles son requeridos" });
        }

        const tienda = await Tienda.findById(req.idTienda);
        if (!tienda) {
            return res.status(404).json({ success: false, message: "Tienda no encontrada para el usuario" });
        }

        const proveedorEncontrado = await Proveedor.findOne({
            _id: proveedorId,
            Tienda: tienda._id,
            estado: true
        });

        if (!proveedorEncontrado) {
            return res.status(404).json({ success: false, message: "Proveedor no encontrado en la tienda" });
        }

        const fechaRegistroCompra = fechaRegistro ? new Date(fechaRegistro) : new Date();
        if (Number.isNaN(fechaRegistroCompra.getTime())) {
            return res.status(400).json({ success: false, message: "La fecha de registro de la compra no es válida" });
        }

        session = await Compra.startSession();
        session.startTransaction();

        let precioTotal = 0;
        const detallesCompra = [];

        for (const [index, detalleOriginal] of detalles.entries()) {
            const indice = index + 1;
            const validacion = validarDetalleCompra(detalleOriginal, indice);

            if (validacion.error) {
                await abortarSesion(session);
                session = null;
                return res.status(400).json({ success: false, message: validacion.error });
            }

            const detalle = validacion.data;

            const categoria = await Categoria.findOne({
                _id: detalle.categoriaId,
                Tienda: tienda._id,
                estado: true
            }).session(session);

            if (!categoria) {
                await abortarSesion(session);
                session = null;
                return res.status(404).json({ success: false, message: `La categoría del detalle #${indice} no existe en la tienda` });
            }

            let producto = await buscarProductoExistente({
                tiendaId: tienda._id,
                detalle,
                session
            });
            const esProductoNuevo = !producto;

            if (!esProductoNuevo) {
                const incompatibilidad = validarCompatibilidadProducto(producto, detalle, indice);
                if (incompatibilidad) {
                    await abortarSesion(session);
                    session = null;
                    return res.status(409).json({ success: false, message: incompatibilidad });
                }

                const actualizacionProducto = {
                    precioVenta: detalle.precioVentaUnidad,
                    perecible: detalle.perecible,
                    imagen: producto.imagen || detalle.imagen
                };

                if (!producto.codigoBarras && detalle.codigoBarras) {
                    actualizacionProducto.codigoBarras = detalle.codigoBarras;
                }

                if (!producto.codigoInterno) {
                    actualizacionProducto.codigoInterno = generarCodigoInterno();
                }

                producto = await Producto.findByIdAndUpdate(
                    producto._id,
                    { $set: actualizacionProducto },
                    { new: true, session }
                );
            } else {
                producto = await new Producto({
                    nombre: detalle.nombre,
                    codigoBarras: detalle.codigoBarras || undefined,
                    codigoInterno: generarCodigoInterno(),
                    imagen: detalle.imagen,
                    cantidadmedida: detalle.cantidadMedida,
                    stockTotal: detalle.cantidadComprada,
                    medida: detalle.medida,
                    perecible: detalle.perecible,
                    precioVenta: detalle.precioVentaUnidad,
                    Tienda: tienda._id,
                    Categoria: detalle.categoriaId
                }).save({ session });
            }

            const nuevoLote = await new LoteProducto({
                stockInicial: detalle.cantidadComprada,
                stockActual: detalle.cantidadComprada,
                precioCompra: detalle.precioCompraUnidad,
                fechaIngreso: detalle.fechaIngreso,
                fechaVencimiento: detalle.fechaVencimiento,
                Producto: producto._id
            }).save({ session });

            if (!esProductoNuevo) {
                await Producto.findByIdAndUpdate(
                    producto._id,
                    { $inc: { stockTotal: detalle.cantidadComprada } },
                    { session }
                );
            }

            const precioTotalDetalle = detalle.cantidadComprada * detalle.precioCompraUnidad;

            detallesCompra.push({
                lote: nuevoLote._id,
                cantidadComprada: detalle.cantidadComprada,
                precioUnitario: detalle.precioCompraUnidad,
                precioTotal: precioTotalDetalle,
                producto: {
                    productoId: producto._id,
                    nombre: producto.nombre,
                    medida: producto.medida,
                    codigoBarras: producto.codigoBarras || null
                }
            });

            precioTotal += precioTotalDetalle;
        }

        const compraGuardada = await new Compra({
            Tienda: tienda._id,
            Proveedor: proveedorEncontrado._id,
            fechaRegistro: fechaRegistroCompra,
            precioTotal,
            detalles: detallesCompra
        }).save({ session });

        await session.commitTransaction();
        session.endSession();
        session = null;

        return res.status(201).json({
            success: true,
            message: "Compra registrada correctamente",
            compra: compraGuardada
        });
    } catch (error) {
        if (session) {
            await session.abortTransaction();
            session.endSession();
        }

        return handleError(res, error, { message: "Error al registrar compra" });
    }
};

module.exports = {
    registrarCompra
};
