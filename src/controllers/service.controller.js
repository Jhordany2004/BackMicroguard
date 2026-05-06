const fetch = require('node-fetch');

const verificarRuc = async (req, res) => {
    const { ruc } = req.params;
    if (!ruc || !/^\d{11}$/.test(ruc)) {
        return res.status(400).json({ message: 'RUC debe tener 11 dígitos numéricos' });
    }
    try {
        const response = await fetch(`https://consultaruc.win/api/ruc/${ruc}`);
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(502).json({ success: false, message: 'Error al consultar el RUC. Respuesta inválida del proveedor.' });
        }
        const data = await response.json();
        if (data && data.result && data.result.estado) {
            return res.status(200).json({
                success: true,
                message: 'RUC encontrado',
                data: {
                    ruc: ruc,
                    razonSocial: data.result.razon_social,
                    estado: data.result.estado
                }
                
            });
        } else {
            return res.status(404).json({ success: false, message: 'RUC no encontrado o inválido' });
        }
    } catch (error) {
        return res.status(502).json({
            success: false,
            message: "Error al consultar el proveedor externo RUC"
        });
    }
};

const verificarDNI = async (req, res) => {
    const { dni } = req.params;
    if (!dni || !/^\d{8}$/.test(dni)) {
        return res.status(400).json({
            success: false,
            message: 'DNI inválido'
            });
    }
    try {
        const apiKey = process.env.API_KEY_DNI;
        const url = `https://dniruc.apisperu.com/api/v1/dni/${dni}?token=${apiKey}`;
        const response = await fetch(url);
        
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            return res.status(502).json({ message: 'Error al consultar el DNI. Respuesta inválida del proveedor.' });
        }
        const data = await response.json();

        if (data && data.success) {
            const apellidos = `${data.apellidoPaterno} ${data.apellidoMaterno}`;
            return res.status(200).json({
                success: true,
                message: "Usuario encontrado",
                data:{
                    dni: dni,
                    nombres: data.nombres,
                    apellidos: apellidos,
                    estado: data.success
                }                            
                
            });
        } else {
            return res.status(404).json({ success: false, message: 'DNI no encontrado o inválido' });
        }
    } catch (error) {
        return res.status(502).json({
            success: false,
            message: "Error al consultar el proveedor externo DNI"
        });
    }
};

module.exports = {
    verificarRuc,
    verificarDNI
}
