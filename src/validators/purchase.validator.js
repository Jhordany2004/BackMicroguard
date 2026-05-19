const { z, idParamsSchema, statusBodySchema, optionalNumeric } = require("./common.validator");

const purchaseDetailSchema = z.object({
    productoId: optionalNumeric,
    ProductoId: optionalNumeric,
    producto_id: optionalNumeric,
    categoriaId: optionalNumeric,
    IdCategoria: optionalNumeric,
    categoria_id: optionalNumeric,
    nombre: z.string().trim().optional(),
    NombreProducto: z.string().trim().optional(),
    codBarras: z.string().trim().optional().nullable(),
    CodigoBarras: z.string().trim().optional().nullable(),
    cod_barras: z.string().trim().optional().nullable(),
    codInterno: z.string().trim().optional().nullable(),
    CodigoInterno: z.string().trim().optional().nullable(),
    cod_interno: z.string().trim().optional().nullable(),
    imagenUrl: z.string().trim().optional().nullable(),
    Imagen: z.string().trim().optional().nullable(),
    imagen_url: z.string().trim().optional().nullable(),
    medida: z.string().trim().optional(),
    Medida: z.string().trim().optional(),
    cantidadMedida: optionalNumeric,
    CantidadMedida: optionalNumeric,
    cantidad_medida: optionalNumeric,
    cantidadComprada: optionalNumeric,
    CantidadComprada: optionalNumeric,
    cantidad_comprada: optionalNumeric,
    precioCompraUnidad: optionalNumeric,
    PrecioCompraUnidad: optionalNumeric,
    precio_compra_unidad: optionalNumeric,
    precioVentaUnidad: optionalNumeric,
    PrecioVentaUnidad: optionalNumeric,
    precio_venta_unidad: optionalNumeric,
    perecible: z.boolean().optional(),
    Perecible: z.boolean().optional(),
    fechaIngreso: z.string().optional(),
    FechaIngreso: z.string().optional(),
    fecha_ingreso: z.string().optional(),
    fechaVencimiento: z.string().optional(),
    FechaVencimiento: z.string().optional(),
    fecha_vencimiento: z.string().optional()
}).passthrough()
    .refine((data) => hasPresent(data, ["productoId", "ProductoId", "producto_id", "nombre", "NombreProducto"]), "Debe enviar producto existente o nombre del producto")
    .refine((data) => hasPresent(data, ["categoriaId", "IdCategoria", "categoria_id"]), "La categoria es obligatoria")
    .refine((data) => hasPresent(data, ["cantidadComprada", "CantidadComprada", "cantidad_comprada"]), "La cantidad comprada es obligatoria")
    .refine((data) => hasPresent(data, ["precioCompraUnidad", "PrecioCompraUnidad", "precio_compra_unidad"]), "El precio de compra unitario es obligatorio")
    .refine((data) => hasPresent(data, ["precioVentaUnidad", "PrecioVentaUnidad", "precio_venta_unidad"]), "El precio de venta unitario es obligatorio");

function hasPresent(data, fields) {
    return fields.some((field) => data[field] !== undefined && data[field] !== null && data[field] !== "");
}

const createPurchaseSchema = z.object({
    proveedorId: optionalNumeric,
    proveedor_id: optionalNumeric,
    proveedor: optionalNumeric,
    Proveedor: optionalNumeric,
    detalles: z.array(purchaseDetailSchema).min(1, "Debe enviar al menos un detalle")
}).passthrough()
    .refine((data) => hasPresent(data, ["proveedorId", "proveedor_id", "proveedor", "Proveedor"]), "Proveedor es obligatorio");

module.exports = {
    idParamsSchema,
    statusBodySchema,
    createPurchaseSchema
};
