const mongoose = require("mongoose");
const Proveedor = require("../models/supplier.model");
const Tienda = require("../models/store.model");

const normalizarTexto = (texto) => typeof texto === "string" ? texto.trim().toUpperCase() : "";
const normalizarDocumento = (doc) => typeof doc === "string" ? doc.trim() : "";
const escaparRegex = (valor) => valor.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const formatearProveedor = (proveedor) => ({
  id: proveedor._id,
  tipoProveedor: proveedor.tipoProveedor,
  documento: proveedor.documento,
  razonSocial: proveedor.razonSocial,
  telefono: proveedor.telefono || "",
  estado: proveedor.estado,
  fechaRegistro: proveedor.createdAt
});

const responderError = (res, error, mensaje) => {
  if (error?.status) {
    return res.status(error.status).json({ success: false, message: error.message });
  }

  if (error?.name === "CastError") {
    return res.status(400).json({ success: false, message: "ID de proveedor invalido" });
  }

  if (error?.code === 11000) {
    return res.status(409).json({ success: false, message: "Documento o razon social ya existe" });
  }

  return res.status(500).json({ success: false, message: error.message || mensaje });
};

const validarObjectId = (id, res) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    res.status(400).json({ success: false, message: "ID de proveedor invalido" });
    return false;
  }

  return true;
};

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
    const tipoProveedor = req.body.tipoProveedor;
    const documento = normalizarDocumento(req.body.documento);
    const razonSocial = normalizarTexto(req.body.razonSocial);
    const telefono = normalizarDocumento(req.body.telefono);

    if (!tipoProveedor || !documento || !razonSocial) {
      return res.status(400).json({
        success: false,
        message: "Tipo, documento y razon social son obligatorios"
      });
    }

    if (!["Natural", "Empresa"].includes(tipoProveedor)) {
      return res.status(400).json({
        success: false,
        message: "Tipo de proveedor invalido"
      });
    }

    if (!validarDocumento(tipoProveedor, documento)) {
      return res.status(400).json({
        success: false,
        message: "Documento no valido para el tipo de proveedor"
      });
    }

    const tienda = await obtenerTienda(req.idTienda);

    const proveedorExistente = await Proveedor.findOne({
      Tienda: tienda._id,
      estado: true,
      $or: [{ documento }, { razonSocial }]
    });

    if (proveedorExistente) {
      return res.status(409).json({
        success: false,
        message: "Ya existe un proveedor activo con ese documento o razon social"
      });
    }

    const proveedor = await Proveedor.create({
      tipoProveedor,
      documento,
      razonSocial,
      telefono,
      Tienda: tienda._id
    });

    return res.status(201).json({
      success: true,
      message: "Proveedor registrado correctamente",
      data: { proveedor: formatearProveedor(proveedor) }
    });
  } catch (error) {
    return responderError(res, error, "Error al registrar proveedor");
  }
};

const listarProveedores = async (req, res) => {
  try {
    const tienda = await obtenerTienda(req.idTienda);

    const proveedores = await Proveedor
      .find({ Tienda: tienda._id })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      message: proveedores.length ? "Proveedores obtenidos correctamente" : "No se encontraron proveedores",
      data: { proveedores: proveedores.map(formatearProveedor) }
    });
  } catch (error) {
    return responderError(res, error, "Error al listar proveedores");
  }
};

const obtenerProveedores = async (req, res) => {
  try {
    const tienda = await obtenerTienda(req.idTienda);

    const proveedores = await Proveedor
      .find({ Tienda: tienda._id, estado: true })
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      message: proveedores.length ? "Proveedores activos obtenidos correctamente" : "No se encontraron proveedores activos",
      data: { proveedores: proveedores.map(formatearProveedor) }
    });
  } catch (error) {
    return responderError(res, error, "Error al obtener proveedores activos");
  }
};

const obtenerProveedorPorID = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validarObjectId(id, res)) return;

    const tienda = await obtenerTienda(req.idTienda);

    const proveedor = await Proveedor.findOne({
      _id: id,
      Tienda: tienda._id
    });

    if (!proveedor) {
      return res.status(404).json({ success: false, message: "Proveedor no encontrado" });
    }

    return res.status(200).json({
      success: true,
      message: "Proveedor obtenido correctamente",
      data: { proveedor: formatearProveedor(proveedor) }
    });
  } catch (error) {
    return responderError(res, error, "Error al obtener proveedor");
  }
};

const cambiarEstadoProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = req.body;

    if (!validarObjectId(id, res)) return;

    if (typeof estado !== "boolean") {
      return res.status(400).json({
        success: false,
        message: "Debe enviar el campo estado como booleano"
      });
    }

    const tienda = await obtenerTienda(req.idTienda);

    const proveedor = await Proveedor.findOne({
      _id: id,
      Tienda: tienda._id
    });

    if (!proveedor) {
      return res.status(404).json({ success: false, message: "Proveedor no encontrado" });
    }

    if (proveedor.estado === estado) {
      return res.status(400).json({
        success: false,
        message: `El proveedor ya esta ${estado ? "habilitado" : "deshabilitado"}`
      });
    }

    proveedor.estado = estado;
    await proveedor.save();

    return res.status(200).json({
      success: true,
      message: `Proveedor ${estado ? "habilitado" : "deshabilitado"} correctamente`,
      data: { proveedor: formatearProveedor(proveedor) }
    });
  } catch (error) {
    return responderError(res, error, "Error al cambiar estado del proveedor");
  }
};

const obtenerPorDocumentoYRazonSocial = async (req, res) => {
  try {
    const documento = normalizarDocumento(req.query.documento);
    const razonSocial = normalizarTexto(req.query.razonSocial);

    if (!documento && !razonSocial) {
      return res.status(400).json({
        success: false,
        message: "Debe enviar documento o razon social para buscar"
      });
    }

    const tienda = await obtenerTienda(req.idTienda);

    const filtro = {
      Tienda: tienda._id,
      estado: true
    };

    if (documento) filtro.documento = documento;
    if (razonSocial) filtro.razonSocial = { $regex: escaparRegex(razonSocial), $options: "i" };

    const proveedores = await Proveedor.find(filtro).limit(50);

    return res.status(200).json({
      success: true,
      message: proveedores.length ? "Proveedores encontrados" : "No hay proveedores activos con esos datos",
      data: { proveedores: proveedores.map(formatearProveedor) }
    });
  } catch (error) {
    return responderError(res, error, "Error al buscar proveedor");
  }
};

const editarProveedor = async (req, res) => {
  try {
    const { id } = req.params;
    if (!validarObjectId(id, res)) return;

    const razonSocial = normalizarTexto(req.body.razonSocial);
    const telefono = normalizarDocumento(req.body.telefono);

    if (!razonSocial && !telefono) {
      return res.status(400).json({
        success: false,
        message: "Debe enviar razon social o telefono para actualizar"
      });
    }

    const tienda = await obtenerTienda(req.idTienda);

    const proveedor = await Proveedor.findOne({
      _id: id,
      Tienda: tienda._id
    });

    if (!proveedor) {
      return res.status(404).json({ success: false, message: "Proveedor no encontrado" });
    }

    if (razonSocial && razonSocial !== proveedor.razonSocial) {
      const proveedorConMismaRazon = await Proveedor.findOne({
        _id: { $ne: id },
        Tienda: tienda._id,
        estado: true,
        razonSocial
      });

      if (proveedorConMismaRazon) {
        return res.status(409).json({
          success: false,
          message: "Ya existe un proveedor activo con esa razon social"
        });
      }
    }

    proveedor.razonSocial = razonSocial || proveedor.razonSocial;
    proveedor.telefono = telefono || proveedor.telefono;

    await proveedor.save();

    return res.status(200).json({
      success: true,
      message: "Proveedor actualizado correctamente",
      data: { proveedor: formatearProveedor(proveedor) }
    });
  } catch (error) {
    return responderError(res, error, "Error al editar proveedor");
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
