const admin = require("../config/firebase");
const { query } = require("../config/database");

const verificarToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token no proporcionado"
    });
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    const result = await query(
      `SELECT id, tienda_id, firebase_uid, nombres, apellidos, correo, rol, estado
       FROM usuarios
       WHERE firebase_uid = $1
       LIMIT 1`,
      [decoded.uid]
    );

    const usuario = result.rows[0];

    if (!usuario) {
      return res.status(401).json({
        success: false,
        message: "Usuario no registrado en el sistema"
      });
    }

    if (!usuario.estado) {
      return res.status(403).json({
        success: false,
        message: "Usuario inhabilitado"
      });
    }

    req.firebaseUser = decoded;
    req.usuario = usuario;
    req.usuarioId = usuario.id;
    req.idTienda = usuario.tienda_id;
    req.rol = usuario.rol;

    return next();
  } catch (error) {
    return res.status(403).json({
      success: false,
      message: "Token invalido o expirado"
    });
  }
};

module.exports = {
  verificarToken
};
