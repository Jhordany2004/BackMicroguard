const supplierService = require("../services/supplier.service");
const { asyncHandler } = require("../utils/asyncHandler");
const { created, success } = require("../utils/handleResponse");
const { requireStore, toBoolean, toPositiveInteger } = require("../utils/validators");

const registrarProveedor = asyncHandler(async (req, res) => {
    const data = await supplierService.createSupplier({
        tiendaId: requireStore(req),
        body: req.body
    });

    return created(res, {
        message: "Proveedor registrado correctamente",
        data
    });
});

const listarProveedores = asyncHandler(async (req, res) => {
    const result = await supplierService.listSuppliers(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay proveedores registrados" : "Proveedores obtenidos correctamente",
        data: { proveedores: result.proveedores }
    });
});

const obtenerProveedores = asyncHandler(async (req, res) => {
    const result = await supplierService.listActiveSuppliers(requireStore(req));

    return success(res, {
        message: result.empty ? "No hay proveedores activos" : "Proveedores activos obtenidos correctamente",
        data: { proveedores: result.proveedores }
    });
});

const obtenerProveedorPorID = asyncHandler(async (req, res) => {
    const data = await supplierService.getSupplier({
        id: toPositiveInteger(req.params.id, "ID de proveedor"),
        tiendaId: requireStore(req)
    });

    return success(res, {
        message: "Proveedor obtenido correctamente",
        data
    });
});

const obtenerPorDocumentoYRazonSocial = asyncHandler(async (req, res) => {
    const result = await supplierService.searchSuppliers({
        tiendaId: requireStore(req),
        query: req.query
    });

    return success(res, {
        message: result.empty ? "No hay proveedores activos con esos datos" : "Proveedores encontrados",
        data: { proveedores: result.proveedores }
    });
});

const editarProveedor = asyncHandler(async (req, res) => {
    const data = await supplierService.updateSupplier({
        id: toPositiveInteger(req.params.id, "ID de proveedor"),
        tiendaId: requireStore(req),
        body: req.body
    });

    return success(res, {
        message: "Proveedor actualizado correctamente",
        data
    });
});

const cambiarEstadoProveedor = asyncHandler(async (req, res) => {
    const estado = toBoolean(req.body.estado);
    const data = await supplierService.updateSupplierStatus({
        id: toPositiveInteger(req.params.id, "ID de proveedor"),
        tiendaId: requireStore(req),
        estado
    });

    return success(res, {
        message: `Proveedor ${estado ? "habilitado" : "deshabilitado"} correctamente`,
        data
    });
});

module.exports = {
    registrarProveedor,
    obtenerProveedores,
    obtenerProveedorPorID,
    listarProveedores,
    cambiarEstadoProveedor,
    obtenerPorDocumentoYRazonSocial,
    editarProveedor
};
