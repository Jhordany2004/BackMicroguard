const fetch = require('node-fetch');

async function fetchRuc(ruc, { timeout = 5000 } = {}) {
    if (!ruc || !/^\d{11}$/.test(ruc)) {
        const err = new Error('RUC inválido');
        err.status = 400;
        throw err;
    }

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const res = await fetch(`https://consultaruc.win/api/ruc/${ruc}`, { signal: controller.signal });
        clearTimeout(id);
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('application/json')) {
            const err = new Error('Respuesta inválida del proveedor RUC');
            err.status = 502;
            throw err;
        }
        const data = await res.json();
        return data && data.result ? data.result : null;
    } catch (error) {
        if (error.name === 'AbortError') {
            const err = new Error('Tiempo de espera al consultar RUC');
            err.status = 504;
            throw err;
        }
        throw error;
    }
}

module.exports = { fetchRuc };
