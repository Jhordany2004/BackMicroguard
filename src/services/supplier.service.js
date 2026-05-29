const supplierRepository = require("../repositories/supplier.repository");
const { badRequest, notFound } = require("../utils/AppError");
const { normalizeText, normalizeUpper } = require("../utils/validators");
const { mapPostgresError } = require("../utils/postgresError");

const formatSupplier = (supplier) => ({
    id: Number(supplier.id),
    tipoProveedor: supplier.tipo_proveedor,
    tipoDocumento: supplier.tipo_documento,
    documento: supplier.documento,
    razonSocial: supplier.razon_social,
    telefono: supplier.telefono || "",
    estado: supplier.estado,
    fechaRegistro: supplier.fecha_registro,
    fechaModificacion: supplier.fecha_modificacion
});

const validateDocument = (tipoDocumento, documento) => {
    if (tipoDocumento === "DNI") return /^\d{8}$/.test(documento);
    if (tipoDocumento === "RUC") return /^\d{11}$/.test(documento);
    if (tipoDocumento === "CE") return documento.length >= 8 && documento.length <= 20;
    return false;
};

const normalizeSupplierData = (body) => {
    const tipoProveedor = normalizeText(body.tipoProveedor ?? body.tipo_proveedor);
    const tipoDocumento = normalizeUpper(body.tipoDocumento ?? body.tipo_documento) || (tipoProveedor === "Natural" ? "DNI" : "RUC");

    return {
        tipoProveedor,
        tipoDocumento,
        documento: normalizeText(body.documento),
        razonSocial: normalizeUpper(body.razonSocial ?? body.razon_social),
        telefono: normalizeText(body.telefono)
    };
};

const validateSupplierData = (data) => {
    if (!data.tipoProveedor || !data.documento || !data.razonSocial) {
        throw badRequest("Tipo, documento y razon social son obligatorios");
    }

    if (!["Natural", "Empresa"].includes(data.tipoProveedor)) {
        throw badRequest("Tipo de proveedor invalido");
    }

    if (!["DNI", "RUC", "CE"].includes(data.tipoDocumento)) {
        throw badRequest("Tipo de documento invalido");
    }

    if (data.tipoProveedor === "Empresa" && data.tipoDocumento !== "RUC") {
        throw badRequest("El proveedor empresa debe tener tipo de documento RUC");
    }

    if (data.tipoProveedor === "Natural" && !["DNI", "RUC", "CE"].includes(data.tipoDocumento)) {
        throw badRequest("El proveedor natural debe tener tipo de documento DNI, RUC o CE");
    }

    if (!validateDocument(data.tipoDocumento, data.documento)) {
        throw badRequest("Documento no valido para el tipo de documento");
    }
};

const createSupplier = async ({ tiendaId, body }) => {
    const data = normalizeSupplierData(body);
    validateSupplierData(data);

    try {
        const supplier = await supplierRepository.create({ tiendaId, data });
        return { proveedor: formatSupplier(supplier) };
    } catch (error) {
        mapPostgresError(error, {
            unique: "Documento o razon social ya existe"
        });
    }
};

const listSuppliers = async (tiendaId) => {
    const suppliers = await supplierRepository.findAllByStore(tiendaId);
    return {
        proveedores: suppliers.map(formatSupplier),
        empty: suppliers.length === 0
    };
};

const listActiveSuppliers = async (tiendaId) => {
    const suppliers = await supplierRepository.findActiveByStore(tiendaId);
    return {
        proveedores: suppliers.map(formatSupplier),
        empty: suppliers.length === 0
    };
};

const getSupplier = async ({ id, tiendaId }) => {
    const supplier = await supplierRepository.findByIdAndStore(id, tiendaId);

    if (!supplier) {
        throw notFound("Proveedor no encontrado");
    }

    return { proveedor: formatSupplier(supplier) };
};

const searchSuppliers = async ({ tiendaId, query }) => {
    const documento = normalizeText(query.documento);
    const razonSocial = normalizeUpper(query.razonSocial);

    if (!documento && !razonSocial) {
        throw badRequest("Debe enviar documento o razon social para buscar");
    }

    const suppliers = await supplierRepository.searchActive({ tiendaId, documento, razonSocial });
    return {
        proveedores: suppliers.map(formatSupplier),
        empty: suppliers.length === 0
    };
};

const updateSupplier = async ({ id, tiendaId, body }) => {
    const razonSocial = normalizeUpper(body.razonSocial);
    const telefono = normalizeText(body.telefono);

    if (!razonSocial && !telefono) {
        throw badRequest("Debe enviar razon social o telefono para actualizar");
    }

    const current = await supplierRepository.findByIdAndStore(id, tiendaId);

    if (!current) {
        throw notFound("Proveedor no encontrado");
    }

    try {
        const supplier = await supplierRepository.update({
            id,
            tiendaId,
            razonSocial: razonSocial || current.razon_social,
            telefono: telefono || current.telefono
        });

        return { proveedor: formatSupplier(supplier) };
    } catch (error) {
        mapPostgresError(error, {
            unique: "Documento o razon social ya existe"
        });
    }
};

const updateSupplierStatus = async ({ id, tiendaId, estado }) => {
    const current = await supplierRepository.findByIdAndStore(id, tiendaId);

    if (!current) {
        throw notFound("Proveedor no encontrado");
    }

    if (current.estado === estado) {
        throw badRequest(`El proveedor ya esta ${estado ? "habilitado" : "deshabilitado"}`);
    }

    const supplier = await supplierRepository.updateStatus({ id, tiendaId, estado });
    return { proveedor: formatSupplier(supplier) };
};

module.exports = {
    createSupplier,
    listSuppliers,
    listActiveSuppliers,
    getSupplier,
    searchSuppliers,
    updateSupplier,
    updateSupplierStatus
};
