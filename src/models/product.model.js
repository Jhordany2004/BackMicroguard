const { Schema, model } = require("mongoose");

const UNIDADES_MEDIDA = ["lt", "ml", "g", "kg", "kl"];

const normalizarTextoOpcional = (valor) => {
    if (typeof valor !== "string") {
        return valor;
    }

    const limpio = valor.trim();
    return limpio === "" ? undefined : limpio;
};

const normalizarNumeroOpcional = (valor) => {
    if (valor === null || valor === undefined || valor === "") {
        return undefined;
    }

    return valor;
};

const modeloProducto = new Schema({
    nombre: { type: String, required: true, trim: true },
    codigoBarras: {
        type: String,
        required: false,
        trim: true,
        sparse: true,
        set: normalizarTextoOpcional
    },
    codigoInterno: {
        type: String,
        required: true,
        trim: true,
        uppercase: true
    },
    imagen: { type: String, required: false, trim: true },
    cantidadmedida: {
        type: Number,
        required: false,
        min: 0.01,
        set: normalizarNumeroOpcional
    },
    precioVenta: { type: Number, required: true, min: 0 },
    stockTotal: { type: Number, required: true, min: 0, default: 0 },
    medida: {
        type: String,
        required: false,
        lowercase: true,
        trim: true,
        set: normalizarTextoOpcional,
        enum: {
            values: UNIDADES_MEDIDA,
            message: "La medida debe ser una de las siguientes: lt, ml, g, kg, kl"
        }
    },
    perecible: { type: Boolean, required: false, default: false },
    Tienda: { type: Schema.Types.ObjectId, ref: "Tienda", required: true },
    Categoria: { type: Schema.Types.ObjectId, ref: "Categoria", required: true },
    estado: { type: Boolean, default: true }
}, { timestamps: true });

modeloProducto.pre("validate", function (next) {
    const tieneCantidad = typeof this.cantidadmedida === "number";
    const tieneMedida = typeof this.medida === "string" && this.medida.trim() !== "";

    if (tieneCantidad !== tieneMedida) {
        this.invalidate(
            "medida",
            "Si el producto tiene medida, debe registrar cantidadmedida y medida; si no tiene medida, ambos campos deben quedar vacios"
        );
    }

    next();
});

modeloProducto.index(
    { Tienda: 1, codigoBarras: 1 },
    {
        unique: true,
        partialFilterExpression: {
            codigoBarras: { $exists: true, $type: "string", $ne: "" }
        }
    }
);
modeloProducto.index(
    { Tienda: 1, codigoInterno: 1 },
    {
        unique: true,
        partialFilterExpression: {
            codigoInterno: { $exists: true, $type: "string", $ne: "" }
        }
    }
);
modeloProducto.index({ Tienda: 1, nombre: 1, cantidadmedida: 1, medida: 1, Categoria: 1 });
modeloProducto.index({ Tienda: 1, estado: 1 });
modeloProducto.index({ Tienda: 1, Categoria: 1, estado: 1 });
modeloProducto.index({ nombre: "text" });
modeloProducto.index({ nombre: 1 });

module.exports = model("Producto", modeloProducto);
