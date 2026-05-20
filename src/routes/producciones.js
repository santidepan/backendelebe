const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");

const router = Router();
const prisma = new PrismaClient();

const includeAll = {
  unidad: true,
  articulo: true,
  insumos: true,
  etapas: true,
};

// Convierte el registro de BD al shape que espera el frontend
function normalize(p) {
  return {
    ...p,
    unidad: p.unidad.nombre,       // "Textil" | "Agencia"  (string, no objeto)
    insumos: p.insumos.map((ins) => ({
      ...ins,
      unidad: ins.unidad_medida,   // el frontend usa "unidad" para la unidad de medida
    })),
  };
}

async function getUnidadId(nombre) {
  const u = await prisma.unidad.findUnique({ where: { nombre } });
  return u?.id ?? null;
}

function buildScalars(data, unidad_id) {
  return {
    nombre: data.nombre || "",
    cliente: data.cliente || "",
    unidad_id,
    articulo_id: data.articulo_id || null,
    descripcion: data.descripcion || "",
    cantidad_prendas: data.cantidad_prendas !== "" ? parseFloat(data.cantidad_prendas) || null : null,
    precio_venta: data.precio_venta !== "" ? parseFloat(data.precio_venta) || null : null,
    fecha_inicio: data.fecha_inicio || null,
    fecha_cierre_estimada: data.fecha_cierre_estimada || null,
    finalizada: Boolean(data.finalizada),
    fecha_fin_real: data.fecha_fin_real || null,
  };
}

function mapInsumos(insumos = []) {
  return insumos.map((ins) => ({
    rubro: ins.rubro || "",
    descripcion: ins.descripcion || "",
    costo_unitario: ins.costo_unitario !== "" ? parseFloat(ins.costo_unitario) || null : null,
    cantidad: ins.cantidad !== "" ? parseFloat(ins.cantidad) || null : null,
    unidad_medida: ins.unidad || null,
  }));
}

function mapEtapas(etapas = []) {
  return etapas.map((et) => ({
    nombre: et.nombre || "",
    taller_proveedor: et.taller_proveedor || "",
    fecha_inicio: et.fecha_inicio || null,
    fecha_cierre: et.fecha_cierre || null,
    estado: et.estado || "pendiente",
    costo_total: et.costo_total !== "" ? parseFloat(et.costo_total) || null : null,
    notas: et.notas || "",
  }));
}

router.get("/", async (_req, res) => {
  try {
    const prods = await prisma.produccion.findMany({
      include: includeAll,
      orderBy: { createdAt: "desc" },
    });
    res.json(prods.map(normalize));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

router.post("/", async (req, res) => {
  const data = req.body;
  try {
    const unidad_id = await getUnidadId(data.unidad);
    if (!unidad_id) return res.status(400).json({ error: "Unidad inválida" });

    const prod = await prisma.produccion.create({
      data: {
        ...buildScalars(data, unidad_id),
        insumos: { create: mapInsumos(data.insumos) },
        etapas: { create: mapEtapas(data.etapas) },
      },
      include: includeAll,
    });
    res.status(201).json(normalize(prod));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const data = req.body;
  try {
    const unidad_id = await getUnidadId(data.unidad);
    if (!unidad_id) return res.status(400).json({ error: "Unidad inválida" });

    // Reemplazar insumos y etapas completamente
    await prisma.insumo.deleteMany({ where: { produccion_id: id } });
    await prisma.etapa.deleteMany({ where: { produccion_id: id } });

    const prod = await prisma.produccion.update({
      where: { id },
      data: {
        ...buildScalars(data, unidad_id),
        insumos: { create: mapInsumos(data.insumos) },
        etapas: { create: mapEtapas(data.etapas) },
      },
      include: includeAll,
    });
    res.json(normalize(prod));
  } catch (err) {
    console.error(err);
    if (err.code === "P2025") return res.status(404).json({ error: "Producción no encontrada" });
    res.status(500).json({ error: "Error interno" });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await prisma.produccion.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    console.error(err);
    if (err.code === "P2025") return res.status(404).json({ error: "Producción no encontrada" });
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = { produccionesRouter: router };
