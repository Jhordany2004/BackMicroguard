const operationRepository = require("../repositories/operation.repository");
const { badRequest, notFound } = require("../utils/AppError");
const { normalizeText, toNumber } = require("../utils/validators");
const { withTransaction } = require("../utils/transaction");
const { mapPostgresError } = require("../utils/postgresError");

const VALID_REASONS = ["Error logistico", "Producto danado", "Traspaso", "Otro"];

const decimal = (value) => (value === null || value === undefined ? null : Number(value));

const formatOperation = (operation) => ({
    id: operation.id,
    razon: operation.razon,
    descripcion: operation.descripcion || null,
    cantidad: decimal(operation.cantidad),
    loteId: operation.lote_id,
    producto: {
        id: operation.producto_id,
        nombre: operation.producto_nombre,
        codInterno: operation.cod_interno,
        codBarras: operation.cod_barras
    },
    estado: operation.estado,
    fechaRegistro: operation.fecha_registro,
    fechaModificacion: operation.fecha_modificacion
});

const createOperation = async ({ tiendaId, usuarioId, body }) => {
    const razon = normalizeText(body.razon);
    const descripcion = normalizeText(body.descripcion);
    const cantidad = toNumber(body.cantidad);
    const loteId = toNumber(body.loteId ?? body.lote_id);

    if (!razon || !cantidad || !loteId) {
        throw badRequest("Razon, cantidad y lote son obligatorios");
    }

    if (!VALID_REASONS.includes(razon)) {
        throw badRequest(`Razon invalida. Las validas son: ${VALID_REASONS.join(", ")}`);
    }

    if (razon === "Otro" && !descripcion) {
        throw badRequest("La descripcion es obligatoria cuando la razon es Otro");
    }

    if (cantidad <= 0) {
        throw badRequest("La cantidad debe ser mayor a cero");
    }

    try {
        return await withTransaction(async (client) => {
            const lot = await operationRepository.findLotForOperation(client, loteId, tiendaId);

            if (!lot) {
                throw notFound("Lote no encontrado");
            }

            if (Number(lot.stock_actual) < cantidad) {
                throw badRequest(`Stock insuficiente. Stock actual: ${Number(lot.stock_actual)}`);
            }

            await operationRepository.decreaseLotStock(client, lot.id, cantidad);
            const operation = await operationRepository.create(client, {
                tiendaId,
                usuarioId,
                lote: lot,
                razon,
                descripcion,
                cantidad
            });

            const savedOperation = await operationRepository.findByIdAndStore(operation.id, tiendaId);

            return {
                operacion: formatOperation(savedOperation),
                stockRestante: Number(lot.stock_actual) - cantidad
            };
        });
    } catch (error) {
        mapPostgresError(error, {
            foreignKey: "Uno de los datos relacionados no existe",
            check: "Los datos de la operacion no cumplen las reglas de la base de datos"
        });
    }
};

const listOperations = async (tiendaId) => {
    const operations = await operationRepository.findAllByStore(tiendaId);

    return {
        operaciones: operations.map(formatOperation),
        empty: operations.length === 0
    };
};

module.exports = {
    createOperation,
    listOperations
};
