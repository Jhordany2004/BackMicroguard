const customerRepository = require("../repositories/customer.repository");
const { badRequest, notFound } = require("../utils/AppError");
const { normalizeText } = require("../utils/validators");
const { mapPostgresError } = require("../utils/postgresError");

const formatCustomer = (customer) => ({
    id: Number(customer.id),
    tipoCliente: customer.tipo_cliente,
    tipoDocumento: customer.tipo_documento,
    documento: customer.documento,
    nombre: customer.nombres,
    apellido: customer.apellidos,
    razonSocial: customer.razon_social,
    telefono: customer.telefono || "",
    estado: customer.estado,
    fechaRegistro: customer.fecha_registro,
    fechaModificacion: customer.fecha_modificacion
});

const hasUpdatePayload = (body) => [
    "tipoCliente",
    "tipo_cliente",
    "tipoDocumento",
    "tipo_documento",
    "documento",
    "nombres",
    "nombre",
    "apellidos",
    "apellido",
    "razonSocial",
    "razon_social",
    "telefono"
].some((field) => body[field] !== undefined);

const buildCustomerData = (body, inferType = false) => {
    const razonSocial = normalizeText(body.razonSocial ?? body.razon_social);
    const nombres = normalizeText(body.nombres ?? body.nombre);
    const apellidos = normalizeText(body.apellidos ?? body.apellido);
    const tipoClienteEnviado = normalizeText(body.tipoCliente ?? body.tipo_cliente);
    const tipoCliente = tipoClienteEnviado || (inferType ? (razonSocial ? "Empresa" : "Natural") : "");
    const tipoDocumentoEnviado = normalizeText(body.tipoDocumento ?? body.tipo_documento).toUpperCase();
    const tipoDocumento = tipoDocumentoEnviado || (inferType && tipoCliente ? (tipoCliente === "Empresa" ? "RUC" : "DNI") : "");

    return {
        tipoCliente,
        tipoDocumento: tipoCliente === "General" ? null : tipoDocumento || null,
        documento: normalizeText(body.documento) || null,
        nombres: nombres || null,
        apellidos: apellidos || null,
        razonSocial: razonSocial || null,
        telefono: normalizeText(body.telefono) || null
    };
};

const validateCustomerData = (data) => {
    if (!["General", "Natural", "Empresa"].includes(data.tipoCliente)) {
        throw badRequest("Tipo de cliente invalido");
    }

    if (data.tipoDocumento && !["DNI", "RUC"].includes(data.tipoDocumento)) {
        throw badRequest("Tipo de documento invalido");
    }

    if (data.tipoCliente === "General") {
        if (data.tipoDocumento || data.documento) {
            throw badRequest("El cliente general no debe tener documento");
        }

        return;
    }

    if (!data.documento) {
        throw badRequest("El documento es obligatorio");
    }

    if (data.tipoCliente === "Natural") {
        if (data.tipoDocumento !== "DNI") {
            throw badRequest("El cliente natural debe tener tipo de documento DNI");
        }

        if (!data.nombres) {
            throw badRequest("Los nombres son obligatorios para cliente natural");
        }
    }

    if (data.tipoCliente === "Empresa") {
        if (data.tipoDocumento !== "RUC") {
            throw badRequest("El cliente empresa debe tener tipo de documento RUC");
        }

        if (!data.razonSocial) {
            throw badRequest("La razon social es obligatoria para cliente empresa");
        }
    }
};

const clearGeneralCustomerFields = (data) => {
    if (data.tipoCliente !== "General") return data;

    return {
        ...data,
        tipoDocumento: null,
        documento: null,
        nombres: null,
        apellidos: null,
        razonSocial: null
    };
};

const createCustomer = async ({ tiendaId, body }) => {
    const data = clearGeneralCustomerFields(buildCustomerData(body, true));
    validateCustomerData(data);

    try {
        const customer = await customerRepository.create({ tiendaId, data });
        return { cliente: formatCustomer(customer) };
    } catch (error) {
        mapPostgresError(error, {
            unique: "Ya existe un cliente con esos datos"
        });
    }
};

const listCustomers = async (tiendaId) => {
    const customers = await customerRepository.findAllByStore(tiendaId);
    return {
        clientes: customers.map(formatCustomer),
        empty: customers.length === 0
    };
};

const listActiveCustomers = async (tiendaId) => {
    const customers = await customerRepository.findActiveByStore(tiendaId);
    return {
        clientes: customers.map(formatCustomer),
        empty: customers.length === 0
    };
};

const getCustomer = async ({ id, tiendaId }) => {
    const customer = await customerRepository.findByIdAndStore(id, tiendaId);

    if (!customer) {
        throw notFound("Cliente no encontrado");
    }

    return { cliente: formatCustomer(customer) };
};

const searchCustomers = async ({ tiendaId, query }) => {
    const documento = normalizeText(query.documento);
    const nombre = normalizeText(query.nombre);

    if (!documento && !nombre) {
        throw badRequest("Debe enviar documento o nombre para buscar");
    }

    const customers = await customerRepository.searchActive({ tiendaId, documento, nombre });
    return {
        clientes: customers.map(formatCustomer),
        empty: customers.length === 0
    };
};

const updateCustomer = async ({ id, tiendaId, body }) => {
    if (!hasUpdatePayload(body)) {
        throw badRequest("Debe enviar datos para actualizar");
    }

    const current = await customerRepository.findByIdAndStore(id, tiendaId);

    if (!current) {
        throw notFound("Cliente no encontrado");
    }

    const incoming = buildCustomerData(body);
    const data = clearGeneralCustomerFields({
        tipoCliente: incoming.tipoCliente || current.tipo_cliente,
        tipoDocumento: incoming.tipoDocumento || current.tipo_documento,
        documento: incoming.documento || current.documento,
        nombres: incoming.nombres || current.nombres,
        apellidos: incoming.apellidos || current.apellidos,
        razonSocial: incoming.razonSocial || current.razon_social,
        telefono: incoming.telefono || current.telefono
    });

    validateCustomerData(data);

    try {
        const customer = await customerRepository.update({ id, tiendaId, data });
        return { cliente: formatCustomer(customer) };
    } catch (error) {
        mapPostgresError(error, {
            unique: "Ya existe un cliente con esos datos"
        });
    }
};

const updateCustomerStatus = async ({ id, tiendaId, estado }) => {
    const current = await customerRepository.findByIdAndStore(id, tiendaId);

    if (!current) {
        throw notFound("Cliente no encontrado");
    }

    if (current.estado === estado) {
        throw badRequest(`El cliente ya esta ${estado ? "habilitado" : "deshabilitado"}`);
    }

    const customer = await customerRepository.updateStatus({ id, tiendaId, estado });
    return { cliente: formatCustomer(customer) };
};

module.exports = {
    createCustomer,
    listCustomers,
    listActiveCustomers,
    getCustomer,
    searchCustomers,
    updateCustomer,
    updateCustomerStatus
};
