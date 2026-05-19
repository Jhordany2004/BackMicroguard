const fetch = require("node-fetch");
const { badRequest, notFound, AppError } = require("../utils/AppError");

const ensureJsonResponse = (response, provider) => {
    const contentType = response.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) {
        throw new AppError(`Error al consultar el ${provider}. Respuesta invalida del proveedor.`, 502);
    }
};

const verifyRuc = async (ruc) => {
    if (!ruc || !/^\d{11}$/.test(ruc)) {
        throw badRequest("RUC debe tener 11 digitos numericos");
    }

    const response = await fetch(`https://consultaruc.win/api/ruc/${ruc}`);
    ensureJsonResponse(response, "RUC");
    const data = await response.json();

    if (!data?.result?.estado) {
        throw notFound("RUC no encontrado o invalido");
    }

    return {
        ruc,
        razonSocial: data.result.razon_social,
        estado: data.result.estado
    };
};

const verifyDni = async (dni) => {
    if (!dni || !/^\d{8}$/.test(dni)) {
        throw badRequest("DNI invalido");
    }

    const response = await fetch(`https://dniruc.apisperu.com/api/v1/dni/${dni}?token=${process.env.API_KEY_DNI}`);
    ensureJsonResponse(response, "DNI");
    const data = await response.json();

    if (!data?.success) {
        throw notFound("DNI no encontrado o invalido");
    }

    return {
        dni,
        nombres: data.nombres,
        apellidos: `${data.apellidoPaterno} ${data.apellidoMaterno}`,
        estado: data.success
    };
};

module.exports = {
    verifyRuc,
    verifyDni
};
