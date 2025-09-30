const { Schema, model } = require('mongoose');

const modeloOperacion = new Schema({
    razon: { type: String, required: true },
    descripcion: { type: String, required: true },
    cantidad: { type: String, required: true },    
    Tienda: { type: Schema.Types.ObjectId, ref: 'Tienda', required: true },
    LoteProducto: { type: Schema.Types.ObjectId, ref: 'LoteProducto', required: true },
    estado: { type: Boolean, required: false, default: true },
}, { timestamps: true });


module.exports = model('Operacion', modeloOperacion);