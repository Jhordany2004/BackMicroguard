const { pool, query } = require("../config/database");

const normalizarTexto = (valor) => typeof valor === "string" ? valor.trim() : "";
const convertirNumero = (valor) => {
    if (valor === null || valor === undefined || valor === "") return null;

    const numero = Number(valor);
    return Number.isFinite(numero) ? numero : null;
};
const decimal = (valor) => valor === null || valor === undefined ? null : Number(valor);

const formatearVenta = (venta) => ({
    id: venta.id,
    cliente: venta.cliente_id
        ? {
            id: venta.cliente_id,
            nombre: venta.cliente_nombre,
            apellido: venta.cliente_apellido,
            documento: venta.cliente_documento
        }
        : null,
    metodoPago: {
        id: venta.metodo_pago_id,
        nombre: venta.metodo_pago_nombre
    },
    precioTotal: decimal(venta.precio_total),
    comprobante: venta.comprobante || null,
    estado: venta.estado,
    fechaRegistro: venta.fecha_registro,
    fechaModificacion: venta.fecha_modificacion
});

const formatearDetalleVenta = (detalle) => ({
    id: detalle.id,
    loteId: detalle.lote_id,
    producto: {
        id: detalle.producto_id,
        nombre: detalle.producto_nombre,
        codInterno: detalle.cod_interno,
        codBarras: detalle.cod_barras
    },
    cantidad: decimal(detalle.cantidad),
    precioUnitario: decimal(detalle.precio_unitario),
    precioTotal: decimal(detalle.precio_total),
    fechaRegistro: detalle.fecha_registro
});

const responderError = (res, error, mensaje) => {
    if (error?.code === "23503") {
        return res.status(400).json({
            success: false,
            message: "Uno de los datos relacionados no existe"
        });
    }

    if (error?.code === "23514") {
        return res.status(400).json({
            success: false,
            message: "Los datos de la venta no cumplen las reglas de la base de datos"
        });
    }

    return res.status(500).json({
        success: false,
        message: error.message || mensaje
    });
};

const validarId = (id, res, entidad = "venta") => {
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

const validarCliente = async (client, clienteId, tiendaId) => {
    if (!clienteId) return null;

    const result = await client.query(
        `SELECT id, nombre, apellido, documento
         FROM clientes
         WHERE id = $1 AND tienda_id = $2 AND estado = TRUE
         LIMIT 1`,
        [clienteId, tiendaId]
    );

    return result.rows[0] || null;
};

const validarMetodoPago = async (client, metodoPagoId, tiendaId) => {
    const result = await client.query(
        `SELECT id, nombre
         FROM metodos_pago
         WHERE id = $1 AND tienda_id = $2 AND estado = TRUE
         LIMIT 1`,
        [metodoPagoId, tiendaId]
    );

    return result.rows[0] || null;
};

const obtenerLoteParaVenta = async (client, loteId, tiendaId) => {
    const result = await client.query(
        `SELECT
            l.id,
            l.producto_id,
            l.stock_actual,
            p.nombre AS producto_nombre,
            p.cod_interno,
            p.cod_barras,
            p.precio_venta
         FROM lotes_producto l
         INNER JOIN productos p ON p.id = l.producto_id
         WHERE l.id = $1
           AND p.tienda_id = $2
           AND l.estado = TRUE
           AND p.estado = TRUE
         LIMIT 1
         FOR UPDATE OF l`,
        [loteId, tiendaId]
    );

    return result.rows[0] || null;
};

const obtenerVentaConDetalles = async (ventaId, tiendaId) => {
    const ventaResult = await query(
        `SELECT
            v.id,
            v.cliente_id,
            cl.nombre AS cliente_nombre,
            cl.apellido AS cliente_apellido,
            cl.documento AS cliente_documento,
            v.metodo_pago_id,
            mp.nombre AS metodo_pago_nombre,
            v.precio_total,
            v.comprobante,
            v.estado,
            v.fecha_registro,
            v.fecha_modificacion
         FROM ventas v
         LEFT JOIN clientes cl ON cl.id = v.cliente_id
         INNER JOIN metodos_pago mp ON mp.id = v.metodo_pago_id
         WHERE v.id = $1 AND v.tienda_id = $2
         LIMIT 1`,
        [ventaId, tiendaId]
    );

    if (!ventaResult.rows.length) return null;

    const detallesResult = await query(
        `SELECT
            dv.id,
            dv.lote_id,
            dv.producto_id,
            p.nombre AS producto_nombre,
            p.cod_interno,
            p.cod_barras,
            dv.cantidad,
            dv.precio_unitario,
            dv.precio_total,
            dv.fecha_registro
         FROM detalle_ventas dv
         INNER JOIN productos p ON p.id = dv.producto_id
         WHERE dv.venta_id = $1
         ORDER BY dv.id ASC`,
        [ventaId]
    );

    return {
        venta: formatearVenta(ventaResult.rows[0]),
        detalles: detallesResult.rows.map(formatearDetalleVenta)
    };
};

const registrarVenta = async (req, res) => {
    const client = await pool.connect();

    try {
        if (!validarTienda(req, res)) return;

        const clienteId = convertirNumero(req.body.clienteId ?? req.body.cliente_id ?? req.body.Cliente);
        const metodoPagoId = convertirNumero(req.body.metodoPagoId ?? req.body.metodo_pago_id ?? req.body.MetodoPago);
        const detalles = req.body.detalles;
        const comprobante = normalizarTexto(req.body.comprobante);

        if (!metodoPagoId || !Array.isArray(detalles) || detalles.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Metodo de pago y detalles son obligatorios"
            });
        }

        await client.query("BEGIN");

        const cliente = await validarCliente(client, clienteId, req.idTienda);
        if (clienteId && !cliente) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Cliente no encontrado o inactivo"
            });
        }

        const metodoPago = await validarMetodoPago(client, metodoPagoId, req.idTienda);
        if (!metodoPago) {
            await client.query("ROLLBACK");
            return res.status(404).json({
                success: false,
                message: "Metodo de pago no encontrado o inactivo"
            });
        }

        const detallesPreparados = [];
        let precioTotalVenta = 0;

        for (const [index, detalle] of detalles.entries()) {
            const indice = index + 1;
            const loteId = convertirNumero(detalle.loteId ?? detalle.lote_id ?? detalle.lote);
            const cantidad = convertirNumero(detalle.cantidad);
            const precioUnitarioEnviado = convertirNumero(detalle.precioUnitario ?? detalle.precio_unitario);

            if (!loteId || cantidad === null || cantidad <= 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    success: false,
                    message: `El detalle #${indice} tiene lote o cantidad invalida`
                });
            }

            const lote = await obtenerLoteParaVenta(client, loteId, req.idTienda);
            if (!lote) {
                await client.query("ROLLBACK");
                return res.status(404).json({
                    success: false,
                    message: `Lote no encontrado en el detalle #${indice}`
                });
            }

            if (Number(lote.stock_actual) < cantidad) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    success: false,
                    message: `Stock insuficiente en el lote del detalle #${indice}`
                });
            }

            const precioUnitario = precioUnitarioEnviado !== null ? precioUnitarioEnviado : Number(lote.precio_venta);
            if (precioUnitario < 0) {
                await client.query("ROLLBACK");
                return res.status(400).json({
                    success: false,
                    message: `El precio unitario del detalle #${indice} no puede ser negativo`
                });
            }

            await client.query(
                `UPDATE lotes_producto
                 SET stock_actual = stock_actual - $1,
                     fecha_modificacion = NOW()
                 WHERE id = $2`,
                [cantidad, lote.id]
            );

            const precioTotalDetalle = cantidad * precioUnitario;
            precioTotalVenta += precioTotalDetalle;

            detallesPreparados.push({
                loteId: lote.id,
                productoId: lote.producto_id,
                cantidad,
                precioUnitario,
                precioTotal: precioTotalDetalle
            });
        }

        const comprobanteFinal = metodoPago.nombre.toLowerCase() !== "efectivo" && comprobante ? comprobante : null;

        const ventaResult = await client.query(
            `INSERT INTO ventas (tienda_id, cliente_id, metodo_pago_id, precio_total, comprobante)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id`,
            [req.idTienda, cliente?.id || null, metodoPago.id, precioTotalVenta, comprobanteFinal]
        );

        const ventaId = ventaResult.rows[0].id;

        for (const detalle of detallesPreparados) {
            await client.query(
                `INSERT INTO detalle_ventas (
                    venta_id,
                    lote_id,
                    producto_id,
                    cantidad,
                    precio_unitario,
                    precio_total
                 )
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    ventaId,
                    detalle.loteId,
                    detalle.productoId,
                    detalle.cantidad,
                    detalle.precioUnitario,
                    detalle.precioTotal
                ]
            );
        }

        await client.query("COMMIT");

        const ventaCompleta = await obtenerVentaConDetalles(ventaId, req.idTienda);

        return res.status(201).json({
            success: true,
            message: "Venta registrada correctamente",
            data: ventaCompleta
        });
    } catch (error) {
        await client.query("ROLLBACK");
        return responderError(res, error, "Error al registrar venta");
    } finally {
        client.release();
    }
};

const listarVentas = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const result = await query(
            `SELECT
                v.id,
                v.cliente_id,
                cl.nombre AS cliente_nombre,
                cl.apellido AS cliente_apellido,
                cl.documento AS cliente_documento,
                v.metodo_pago_id,
                mp.nombre AS metodo_pago_nombre,
                v.precio_total,
                v.comprobante,
                v.estado,
                v.fecha_registro,
                v.fecha_modificacion
             FROM ventas v
             LEFT JOIN clientes cl ON cl.id = v.cliente_id
             INNER JOIN metodos_pago mp ON mp.id = v.metodo_pago_id
             WHERE v.tienda_id = $1
             ORDER BY v.fecha_registro DESC
             LIMIT 100`,
            [req.idTienda]
        );

        return res.status(200).json({
            success: true,
            message: result.rows.length ? "Ventas obtenidas correctamente" : "No hay ventas registradas",
            data: { ventas: result.rows.map(formatearVenta) }
        });
    } catch (error) {
        return responderError(res, error, "Error al listar ventas");
    }
};

const buscarVenta = async (req, res) => {
    try {
        if (!validarTienda(req, res)) return;

        const id = validarId(req.params.id, res);
        if (!id) return;

        const ventaCompleta = await obtenerVentaConDetalles(id, req.idTienda);

        if (!ventaCompleta) {
            return res.status(404).json({
                success: false,
                message: "Venta no encontrada"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Venta obtenida correctamente",
            data: ventaCompleta
        });
    } catch (error) {
        return responderError(res, error, "Error al buscar venta");
    }
};

const cambiarEstadoVenta = async (req, res) => {
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
            `UPDATE ventas
             SET estado = $1,
                 fecha_modificacion = NOW()
             WHERE id = $2 AND tienda_id = $3
             RETURNING id`,
            [estado, id, req.idTienda]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Venta no encontrada"
            });
        }

        const ventaCompleta = await obtenerVentaConDetalles(id, req.idTienda);

        return res.status(200).json({
            success: true,
            message: `Venta ${estado ? "habilitada" : "deshabilitada"} correctamente`,
            data: ventaCompleta
        });
    } catch (error) {
        return responderError(res, error, "Error al cambiar estado de la venta");
    }
};

module.exports = {
    registrarVenta,
    listarVentas,
    buscarVenta,
    cambiarEstadoVenta
};
