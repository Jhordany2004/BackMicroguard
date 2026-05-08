const crypto = require("crypto");
const { pool, query } = require("../config/database");

const MEDIDAS_VALIDAS = ["lt", "ml", "g", "kg", "kl"];

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";
const normalizarNombre = (valor) => normalizarTexto(valor).replace(/\s+/g, " ");
const normalizarMedida = (valor) => normalizarTexto(valor).toLowerCase();
const normalizarCodigo = (valor) => {
    const texto = normalizarTexto(valor);
    return texto ? texto.toUpperCase() : "";
};
const convertirNumero = (valor) => {
    if (valor === null || valor === undefined || valor === "") return null;

    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
};
const convertirBooleano = (valor) => typeof valor === "boolean" ? valor : Boolean(valor);
const convertirDecimal = (valor) => valor === null || valor === undefined ? null : Number(valor);
const generarCodigoInterno = () => `INT-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;

const formatearCompra = (compra) => ({
    id: compra.id,
    proveedor: {
        id: compra.proveedor_id,
        razonSocial: compra.proveedor_razon_social
    },
    precioTotal: convertirDecimal(compra.precio_total),
    estado: compra.estado,
    fechaRegistro: compra.fecha_registro,
    fechaModificacion: compra.fecha_modificacion
});

const formatearDetalleCompra = (detalle) => ({
    id: detalle.id,
    loteId: detalle.lote_id,
    producto: {
        id: detalle.producto_id,
        nombre: detalle.prod_nombre,
        medida: detalle.prod_medida,
        codBarras: detalle.prod_cod_barras
    },
    cantidadComprada: convertirDecimal(detalle.cantidad_comprada),
    precioUnitario: convertirDecimal(detalle.precio_unitario),
    precioTotal: convertirDecimal(detalle.precio_total),
    fechaRegistro: detalle.fecha_registro
});

const responderError = (res, error, mensaje) => {
    if (error?.code === "23505") {
        return res.status(409).json({
            success: false,
            message: "Existe un registro duplicado en la compra"
        });
    }

    if (error?.code === "23503") {
        return res.status(400).json({
            success: false,
            message: "Uno de los datos relacionados no existe"
        });
    }

    if (error?.code === "23514") {
        return res.status(400).json({
            success: false,
            message: "Los datos de la compra no cumplen las reglas de la base de datos"
        });
    }

    return res.status(500).json({
        success: false,
        message: error.message || mensaje
    });
};

const validarId = (id, res, entidad = "compra") => {
    const numero = Number(id);

    if (!Number.isInteger(numero) || numero <= 0) {
        res.status(400).json({
            success: false,
            message: `ID de ${entidad} invalido`
        });
        return null;
    }

    return numero;
};

const validarTienda = (req, res) => {
    if (!req.idTienda) {
        res.status(403).json({
            success: false,
            message: "Usuario sin tienda asociada"
        });
        return false;
    }

    return true;
};

const validarFecha = (valor, campo, indice) => {
    if (!valor) return { fecha: null };

    const fecha = new Date(valor);
    if (Number.isNaN(fecha.getTime())) {
        return { error: `${campo} del detalle #${indice} no es valida` };
    }

    return { fecha };
};

const validarDetalleCompra = (detalle, indice) => {
    const productoId = convertirNumero(detalle.productoId ?? detalle.ProductoId ?? detalle.producto_id);
    const categoriaId = convertirNumero(detalle.categoriaId ?? detalle.IdCategoria ?? detalle.categoria_id);
    const nombre = normalizarNombre(detalle.nombre ?? detalle.NombreProducto);
    const codBarras = normalizarTexto(detalle.codBarras ?? detalle.CodigoBarras ?? detalle.cod_barras);
    const codInterno = normalizarCodigo(detalle.codInterno ?? detalle.CodigoInterno ?? detalle.cod_interno);
    const imagenUrl = normalizarTexto(detalle.imagenUrl ?? detalle.Imagen ?? detalle.imagen_url) || process.env.URL_PRODUCTO_PREDETERMINADO || null;
    const medida = normalizarMedida(detalle.medida ?? detalle.Medida);
    const cantidadMedida = convertirNumero(detalle.cantidadMedida ?? detalle.CantidadMedida ?? detalle.cantidad_medida);
    const cantidadComprada = convertirNumero(detalle.cantidadComprada ?? detalle.CantidadComprada ?? detalle.cantidad_comprada);
    const precioCompraUnidad = convertirNumero(detalle.precioCompraUnidad ?? detalle.PrecioCompraUnidad ?? detalle.precio_compra_unidad);
    const precioVentaUnidad = convertirNumero(detalle.precioVentaUnidad ?? detalle.PrecioVentaUnidad ?? detalle.precio_venta_unidad);
    const perecible = convertirBooleano(detalle.perecible ?? detalle.Perecible);
    const fechaIngreso = validarFecha(detalle.fechaIngreso ?? detalle.FechaIngreso ?? detalle.fecha_ingreso, "La fecha de ingreso", indice);
    const fechaVencimiento = validarFecha(detalle.fechaVencimiento ?? detalle.FechaVencimiento ?? detalle.fecha_vencimiento, "La fecha de vencimiento", indice);

    if (fechaIngreso.error) return fechaIngreso;
    if (fechaVencimiento.error) return fechaVencimiento;

    if (!productoId && !nombre) {
        return { error: `El nombre del producto es obligatorio en el detalle #${indice}` };
    }

    if (!categoriaId) {
        return { error: `La categoria es obligatoria en el detalle #${indice}` };
    }

    const tieneMedida = Boolean(medida);
    const tieneCantidadMedida = cantidadMedida !== null && cantidadMedida > 0;

    if (tieneMedida !== tieneCantidadMedida) {
        return { error: `El detalle #${indice} debe enviar cantidad de medida y medida juntas, o dejar ambas vacias` };
    }

    if (tieneMedida && !MEDIDAS_VALIDAS.includes(medida)) {
        return { error: `La medida del detalle #${indice} debe ser lt, ml, g, kg o kl` };
    }

    if (cantidadComprada === null || cantidadComprada <= 0) {
        return { error: `La cantidad comprada debe ser mayor a cero en el detalle #${indice}` };
    }

    if (precioCompraUnidad === null || precioCompraUnidad < 0) {
        return { error: `El precio de compra unitario no puede ser negativo en el detalle #${indice}` };
    }

    if (precioVentaUnidad === null || precioVentaUnidad < 0) {
        return { error: `El precio de venta unitario no puede ser negativo en el detalle #${indice}` };
    }

    if (perecible && !fechaVencimiento.fecha) {
        return { error: `El detalle #${indice} es perecible y requiere fecha de vencimiento` };
    }

    if (fechaIngreso.fecha && fechaVencimiento.fecha && fechaVencimiento.fecha < fechaIngreso.fecha) {
        return { error: `La fecha de vencimiento del detalle #${indice} no puede ser menor a la fecha de ingreso` };
    }

    return {
        data: {
            productoId,
            categoriaId,
            nombre,
            codBarras: codBarras || null,
            codInterno: codInterno || null,
            imagenUrl,
            cantidadMedida: tieneCantidadMedida ? cantidadMedida : null,
            medida: tieneMedida ? medida : null,
            cantidadComprada,
            precioCompraUnidad,
            precioVentaUnidad,
            perecible,
            fechaIngreso: fechaIngreso.fecha || new Date(),
            fechaVencimiento: fechaVencimiento.fecha
        }
    };
};

const validarProveedor = async (client, proveedorId, tiendaId) => {
    const result = await client.query(
        `SELECT id, razon_social
         FROM proveedores
         WHERE id = $1 AND tienda_id = $2 AND estado = TRUE
         LIMIT 1`,
        [proveedorId, tiendaId]
    );

    return result.rows[0] || null;
};

const validarCategoria = async (client, categoriaId, tiendaId) => {
    const result = await client.query(
        `SELECT id
         FROM categorias
         WHERE id = $1 AND tienda_id = $2 AND estado = TRUE
         LIMIT 1`,
        [categoriaId, tiendaId]
    );

    return result.rows.length > 0;
};

const buscarProductoExistente = async (client, detalle, tiendaId) => {
    if (detalle.productoId) {
        const result = await client.query(
            `SELECT *
             FROM productos
             WHERE id = $1 AND tienda_id = $2 AND estado = TRUE
             LIMIT 1
             FOR UPDATE`,
            [detalle.productoId, tiendaId]
        );

        return result.rows[0] || null;
    }

    if (detalle.codBarras) {
        const result = await client.query(
            `SELECT *
             FROM productos
             WHERE tienda_id = $1 AND cod_barras = $2 AND estado = TRUE
             LIMIT 1
             FOR UPDATE`,
            [tiendaId, detalle.codBarras]
        );

        if (result.rows.length) return result.rows[0];
    }

    const result = await client.query(
        `SELECT *
         FROM productos
         WHERE tienda_id = $1
           AND nombre = $2
           AND categoria_id = $3
           AND cantidad_medida IS NOT DISTINCT FROM $4
           AND medida IS NOT DISTINCT FROM $5
           AND estado = TRUE
         LIMIT 1
         FOR UPDATE`,
        [tiendaId, detalle.nombre, detalle.categoriaId, detalle.cantidadMedida, detalle.medida]
    );

    return result.rows[0] || null;
};

const validarCompatibilidadProducto = (producto, detalle, indice) => {
    if (Number(producto.categoria_id) !== Number(detalle.categoriaId)) {
        return `La categoria del detalle #${indice} no coincide con el producto existente`;
    }

    if (producto.cantidad_medida !== null && Number(producto.cantidad_medida) !== Number(detalle.cantidadMedida)) {
        return `La presentacion del detalle #${indice} no coincide con el producto existente`;
    }

    if (producto.cantidad_medida === null && detalle.cantidadMedida !== null) {
        return `La presentacion del detalle #${indice} no coincide con el producto existente`;
    }

    if ((producto.medida || null) !== (detalle.medida || null)) {
        return `La presentacion del detalle #${indice} no coincide con el producto existente`;
    }

    if (detalle.codBarras && producto.cod_barras && producto.cod_barras !== detalle.codBarras) {
        return `El codigo de barras del detalle #${indice} no coincide con el producto existente`;
    }

    return null;
};

const crearProducto = async (client, detalle, tiendaId) => {
    const result = await client.query(
        `INSERT INTO productos (
            tienda_id,
            categoria_id,
            nombre,
            cod_barras,
            cod_interno,
            imagen_url,
            cantidad_medida,
            medida,
            precio_venta,
            perecible
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
            tiendaId,
            detalle.categoriaId,
            detalle.nombre,
            detalle.codBarras,
            detalle.codInterno || generarCodigoInterno(),
            detalle.imagenUrl,
            detalle.cantidadMedida,
            detalle.medida,
            detalle.precioVentaUnidad,
            detalle.perecible
        ]
    );

    return result.rows[0];
};

const actualizarProducto = async (client, producto, detalle) => {
    const result = await client.query(
        `UPDATE productos
         SET precio_venta = $1,
             perecible = $2,
             cod_barras = COALESCE(cod_barras, $3),
             imagen_url = COALESCE(imagen_url, $4),
             fecha_modificacion = NOW()
         WHERE id = $5
         RETURNING *`,
        [
            detalle.precioVentaUnidad,
            detalle.perecible,
            detalle.codBarras,
            detalle.imagenUrl,
            producto.id
        ]
    );

    return result.rows[0];
};

const crearLote = async (client, detalle, productoId) => {
    const result = await client.query(
        `INSERT INTO lotes_producto (
            producto_id,
            stock_inicial,
            stock_actual,
            precio_compra,
            fecha_ingreso,
            fecha_vencimiento
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
            productoId,
            detalle.cantidadComprada,
            detalle.cantidadComprada,
            detalle.precioCompraUnidad,
            detalle.fechaIngreso,
            detalle.fechaVencimiento
        ]
    );

    return result.rows[0];
};

const obtenerCompraConDetalles = async (compraId, tiendaId) => {
    const compraResult = await query(
        `SELECT
            c.id,
            c.proveedor_id,
            p.razon_social AS proveedor_razon_social,
            c.precio_total,
            c.estado,
            c.fecha_registro,
            c.fecha_modificacion
         FROM compras c
         INNER JOIN proveedores p ON p.id = c.proveedor_id
         WHERE c.id = $1 AND c.tienda_id = $2
         LIMIT 1`,
        [compraId, tiendaId]
    );

    if (!compraResult.rows.length) return null;

    const detallesResult = await query(
        `SELECT
            id,
            lote_id,
            producto_id,
            cantidad_comprada,
            precio_unitario,
            precio_total,
            prod_nombre,
            prod_medida,
            prod_cod_barras,
            fecha_registro
         FROM detalle_compras
         WHERE compra_id = $1
         ORDER BY id ASC`,
        [compraId]
    );

    return {
        compra: formatearCompra(compraResult.rows[0]),
        detalles: detallesResult.rows.map(formatearDetalleCompra)
    };
};

const registrarCompra = async (req, res) => {
    const client = await pool.connect();

    try {
        if (!validarTienda(req, res)) return;

        const proveedorId = convertirNumero(req.body.proveedorId ?? req.body.proveedor_id ?? req.body.proveedor ?? req.body.Proveedor);
        const detalles = req.body.detalles;

        if (!proveedorId || !Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Proveedor y detalles son obligatorios"
            });
        }

        await client.query("BEGIN");

        const proveedor = await validarProveedor(client, proveedorId, req.idTienda);
        if (!proveedor) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Proveedor no encontrado o inactivo"
            });
        }

        const detallesPreparados = [];
        let precioTotalCompra = 0;

        for (const [index, detalleOriginal] of detalles.entries()) {
            const indice = index + 1;
            const validacion = validarDetalleCompra(detalleOriginal, indice);

            if (validacion.error) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    success: false,
                    message: validacion.error
                });
            }

            const detalle = validacion.data;
            const categoriaExiste = await validarCategoria(client, detalle.categoriaId, req.idTienda);

            if (!categoriaExiste) {
                await client.query("ROLLBACK");
                return res.status(404).json({
                    success: false,
                    message: `La categoria del detalle #${indice} no existe o esta inactiva`
                });
            }

            let producto = await buscarProductoExistente(client, detalle, req.idTienda);

            if (producto) {
                const incompatibilidad = validarCompatibilidadProducto(producto, detalle, indice);
                if (incompatibilidad) {
                    await client.query("ROLLBACK");
                    return res.status(409).json({
                        success: false,
                        message: incompatibilidad
                    });
                }

                producto = await actualizarProducto(client, producto, detalle);
            } else {
                producto = await crearProducto(client, detalle, req.idTienda);
            }

            const lote = await crearLote(client, detalle, producto.id);
            const precioTotalDetalle = detalle.cantidadComprada * detalle.precioCompraUnidad;
            precioTotalCompra += precioTotalDetalle;

            detallesPreparados.push({
                loteId: lote.id,
                productoId: producto.id,
                cantidadComprada: detalle.cantidadComprada,
                precioUnitario: detalle.precioCompraUnidad,
                precioTotal: precioTotalDetalle,
                prodNombre: producto.nombre,
                prodMedida: producto.medida,
                prodCodBarras: producto.cod_barras
            });
        }

        const compraResult = await client.query(
            `INSERT INTO compras (tienda_id, proveedor_id, precio_total)
             VALUES ($1, $2, $3)
             RETURNING id`,
            [req.idTienda, proveedor.id, precioTotalCompra]
        );

        const compraId = compraResult.rows[0].id;

        for (const detalle of detallesPreparados) {
            await client.query(
                `INSERT INTO detalle_compras (
                    compra_id,
                    lote_id,
                    producto_id,
                    cantidad_comprada,
                    precio_unitario,
                    precio_total,
                    prod_nombre,
                    prod_medida,
                    prod_cod_barras
                 )
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [
                    compraId,
                    detalle.loteId,
                    detalle.productoId,
                    detalle.cantidadComprada,
                    detalle.precioUnitario,
                    detalle.precioTotal,
                    detalle.prodNombre,
                    detalle.prodMedida,
                    detalle.prodCodBarras
                ]
            );
        }

        await client.query("COMMIT");

        const compraCompleta = await obtenerCompraConDetalles(compraId, req.idTienda);

        return res.status(201).json({
            success: true,
            message: "Compra registrada correctamente",
            data: compraCompleta
        });
    } catch (error) {
        await client.query("ROLLBACK");
        return responderError(res, error, "Error al registrar compra");
    } finally {
        client.release();
    }
};

const listarCompras = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const result = await query(
            `SELECT
                c.id,
                c.proveedor_id,
                p.razon_social AS proveedor_razon_social,
                c.precio_total,
                c.estado,
                c.fecha_registro,
                c.fecha_modificacion
             FROM compras c
             INNER JOIN proveedores p ON p.id = c.proveedor_id
             WHERE c.tienda_id = $1
             ORDER BY c.fecha_registro DESC
             LIMIT 100`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Compras obtenidas correctamente" : "No hay compras registradas",
            data: { compras: result.rows.map(formatearCompra) }
        });
    } catch (error) {
        return responderError(res, error, "Error al listar compras");
    }
};

const buscarCompra = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const compraCompleta = await obtenerCompraConDetalles(id, req.idTienda);

        if (!compraCompleta) {
            return res.status(404).json({
                success: false,
                message: "Compra no encontrada"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Compra obtenida correctamente",
            data: compraCompleta
        });
    } catch (error) {
        return responderError(res, error, "Error al buscar compra");
    }
};

const cambiarEstadoCompra = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const { estado } = req.body;

        if (typeof estado !== "boolean") {
            return res.status(400).json({
                success: false,
                message: "Debe enviar el campo estado como booleano"
            });
        }

        const result = await query(
            `UPDATE compras
             SET estado = $1,
                 fecha_modificacion = NOW()
             WHERE id = $2 AND tienda_id = $3
             RETURNING id`,
            [estado, id, req.idTienda]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Compra no encontrada"
            });
        }

        const compraCompleta = await obtenerCompraConDetalles(id, req.idTienda);

        return res.status(200).json({
            success: true,
            message: `Compra ${estado ? "habilitada" : "deshabilitada"} correctamente`,
            data: compraCompleta
        });
    } catch (error) {
        return responderError(res, error, "Error al cambiar estado de la compra");
    }
};

module.exports = {
    registrarCompra,
    listarCompras,
    buscarCompra,
    cambiarEstadoCompra
};
