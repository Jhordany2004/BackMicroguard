const Proveedor = require("../models/supplier.model");
const Tienda = require("../models/store.model");
const { handleError } = require('../utils/handleError');
const { success } = require("../utils/handleResponse");

const normalizarTexto = (texto) => texto?.trim().toUpperCase();
const normalizarDocumento = (doc) => doc?.trim();

const validarDocumento = (tipo, doc) => {
  if (tipo === "Natural" && doc.length !== 8) return false;
  if (tipo === "Empresa" && doc.length !== 11) return false;
  return true;
};

const obtenerTienda = async (idTienda) => {
  const tienda = await Tienda.findById(idTienda);
  if (!tienda) throw { status: 404, message: "Tienda no encontrada" };
  return tienda;
};

const registrarProveedor = async (req, res) => {
  try {
    const { tipoProveedor, documento, razonSocial, telefono } = req.body;

    if (!tipoProveedor || !documento || !razonSocial) {
      return res.status(400).json({ message: "Tipo, Documento y Razón Social son obligatorios" });
    }

    if (!['Natural', 'Empresa'].includes(tipoProveedor)) {
      return res.status(400).json({ message: "TipoProveedor inválido" });
    }

    const doc = normalizarDocumento(documento);
    const rs = normalizarTexto(razonSocial);

    if (!validarDocumento(tipoProveedor, doc)) {
      return res.status(400).json({ message: "Documento no válido para el tipo de proveedor" });
    }

    const tienda = await obtenerTienda(req.idTienda);

    const proveedor = await Proveedor.create({
      tipoProveedor,
      documento: doc,
      razonSocial: rs,
      telefono,
      Tienda: tienda._id
    });

    return success(res, { message: "Proveedor registrado", data: proveedor });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Documento o razón social ya existe" });
    }
    return handleError(res, error, { message: "Error al registrar proveedor" });
  }
};

const listarProveedores = async (req, res) => {
  try {
    const tienda = await obtenerTienda(req.idTienda);

    const proveedores = await Proveedor
      .find({ Tienda: tienda._id })
      .select("tipoProveedor documento razonSocial telefono estado createdAt")
      .sort({ createdAt: -1 });

    return success(res, {
      message: proveedores.length
        ? "Lista de proveedores"
        : "No se encontraron proveedores",
      data: proveedores
    });

  } catch (error) {
    return handleError(res, error);
  }
};

const obtenerProveedores = async (req, res) => {
  try {
    const tienda = await obtenerTienda(req.idTienda);

    const proveedores = await Proveedor
      .find({ Tienda: tienda._id, estado: true })
      .select("tipoProveedor documento razonSocial telefono estado createdAt")
      .sort({ createdAt: -1 });

    return success(res, {
      message: proveedores.length
        ? "Proveedores activos encontrados"
        : "No se encontraron proveedores activos",
      data: proveedores
    });

  } catch (error) {
    return handleError(res, error);
  }
};

const obtenerProveedorPorID = async (req, res) => {
  try {
    const tienda = await obtenerTienda(req.idTienda);

    const proveedor = await Proveedor.findOne({
      _id: req.params.id,
      Tienda: tienda._id
    });

    if (!proveedor) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    return success(res, { message: "Proveedor encontrado", data: proveedor });

  } catch (error) {
    return handleError(res, error);
  }
};

const cambiarEstadoProveedor = async (req, res) => {
  try {
    const tienda = await obtenerTienda(req.idTienda);
    const { id } = req.params;
    const { estado } = req.body;

    if (typeof estado !== "boolean") {
        return res.status(400).json({
            message: "Debe enviar el campo estado (true o false)"
        });
    }

    const proveedor = await Proveedor.findOne({
        _id: id,
        Tienda: tienda._id
    });

    if (!proveedor) {
        return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    if (proveedor.estado === estado) {
        return res.status(400).json({
            message: `El proveedor ya está ${estado ? "habilitado" : "deshabilitado"}`
        });
    }

    proveedor.estado = estado;
    await proveedor.save();

    return success(res, {
        message: `Proveedor ${estado ? "habilitado" : "deshabilitado"} correctamente`,
        data: proveedor
    });

  } catch (error) {
    return handleError(res, error);
  }
};


const obtenerPorDocumentoYRazonSocial = async (req, res) => {
  try {
    const tienda = await obtenerTienda(req.idTienda);

    const filtro = {
      Tienda: tienda._id,
      estado: true
    };
    
    if (!req.query.documento && !req.query.razonSocial) {
    return res.status(400).json({
        message: "Debe enviar documento o razón social para buscar"
    });
}
    if (req.query.documento) filtro.documento = normalizarDocumento(req.query.documento);
    if (req.query.razonSocial) filtro.razonSocial = normalizarTexto(req.query.razonSocial);

    const proveedores = await Proveedor.find(filtro);

    return success(res, {
       message: proveedores.length
        ? "Resultado de búsqueda"
        : "No se encontraron resultados",
      data: proveedores
    });

  } catch (error) {
    return handleError(res, error);
  }
};

const editarProveedor = async (req, res) => {
  try {
    const tienda = await obtenerTienda(req.idTienda);

    const proveedor = await Proveedor.findOne({
      _id: req.params.id,
      Tienda: tienda._id
    });

    if (!proveedor) {
      return res.status(404).json({ message: "Proveedor no encontrado" });
    }

    if (!req.body.razonSocial && !req.body.telefono) {
      return res.status(400).json({
        message: "Debe enviar razón social o teléfono para actualizar"
      });
    }

    if (req.body.razonSocial) {
      proveedor.razonSocial = normalizarTexto(req.body.razonSocial);
    }

    if (req.body.telefono) {
      proveedor.telefono = req.body.telefono;
    }

    await proveedor.save();

    return success(res, {
      message: "Proveedor actualizado",
      data: proveedor
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Razón social ya existe" });
    }
    return handleError(res, error);
  }
};

module.exports = {
    registrarProveedor,
    obtenerProveedores,
    obtenerProveedorPorID,
    listarProveedores,
    cambiarEstadoProveedor,
    obtenerPorDocumentoYRazonSocial,
    editarProveedor
};
