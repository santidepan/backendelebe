const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { adminOnly } = require("../middleware/auth");

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (_req, res) => {
  try {
    const articulos = await prisma.articulo.findMany({
      include: { unidad: true },
      orderBy: { label: "asc" },
    });
    res.json(articulos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// Recibe { textil: [{id, label}], agencia: [{id, label}] }
// Upserta y elimina para que la BD quede igual a la lista recibida
router.put("/sync", adminOnly, async (req, res) => {
  const { textil = [], agencia = [] } = req.body;
  try {
    const [unidadTextil, unidadAgencia] = await Promise.all([
      prisma.unidad.findUnique({ where: { nombre: "Textil" } }),
      prisma.unidad.findUnique({ where: { nombre: "Agencia" } }),
    ]);

    if (!unidadTextil || !unidadAgencia) {
      return res.status(500).json({ error: "Unidades no encontradas en la base de datos" });
    }

    const syncUnit = async (lista, unidad_id) => {
      const existingIds = (
        await prisma.articulo.findMany({ where: { unidad_id }, select: { id: true } })
      ).map((a) => a.id);

      const incomingIds = lista.map((a) => a.id);
      const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

      if (toDelete.length > 0) {
        await prisma.articulo.deleteMany({ where: { id: { in: toDelete } } });
      }

      for (const art of lista) {
        await prisma.articulo.upsert({
          where: { id: art.id },
          update: { label: art.label },
          create: { id: art.id, label: art.label, unidad_id },
        });
      }

      return prisma.articulo.findMany({
        where: { unidad_id },
        orderBy: { label: "asc" },
      });
    };

    const [resultTextil, resultAgencia] = await Promise.all([
      syncUnit(textil, unidadTextil.id),
      syncUnit(agencia, unidadAgencia.id),
    ]);

    res.json({ textil: resultTextil, agencia: resultAgencia });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// GET /api/articulos/:id/standard
router.get("/:id/standard", async (req, res) => {
  const { id } = req.params;
  try {
    const articulo = await prisma.articulo.findUnique({
      where: { id },
      select: {
        descripcion_standard: true,
        etapasStandard: {
          include: { tipoEtapa: { select: { nombre: true } } },
          orderBy: { orden: "asc" },
        },
        insumosStandard: {
          orderBy: { orden: "asc" },
        },
      },
    });
    if (!articulo) return res.status(404).json({ error: "Artículo no encontrado" });
    res.json({
      descripcion_standard: articulo.descripcion_standard || "",
      etapas: articulo.etapasStandard.map((e) => ({
        id: e.id,
        tipo_etapa_id: e.tipo_etapa_id,
        tipoEtapa: { nombre: e.tipoEtapa.nombre },
        costo_unitario: e.costo_unitario,
        orden: e.orden,
      })),
      insumos: articulo.insumosStandard.map((ins) => ({
        id: ins.id,
        descripcion: ins.descripcion,
        costo_unitario: ins.costo_unitario,
        orden: ins.orden,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// PUT /api/articulos/:id/standard
router.put("/:id/standard", adminOnly, async (req, res) => {
  const { id } = req.params;
  const { descripcion_standard, etapas = [], insumos = [] } = req.body;
  try {
    // Delete existing and update description in one transaction
    await prisma.$transaction([
      prisma.articuloEtapaStandard.deleteMany({ where: { articulo_id: id } }),
      prisma.articuloInsumoStandard.deleteMany({ where: { articulo_id: id } }),
      prisma.articulo.update({
        where: { id },
        data: { descripcion_standard: descripcion_standard || null },
      }),
    ]);

    if (etapas.length > 0) {
      await prisma.articuloEtapaStandard.createMany({
        data: etapas.map((e, idx) => ({
          articulo_id: id,
          tipo_etapa_id: e.tipo_etapa_id,
          costo_unitario: parseFloat(e.costo_unitario) || 0,
          orden: e.orden !== undefined ? e.orden : idx,
        })),
      });
    }

    const insumosValidos = insumos.filter((ins) => ins.descripcion?.trim());
    if (insumosValidos.length > 0) {
      await prisma.articuloInsumoStandard.createMany({
        data: insumosValidos.slice(0, 5).map((ins, idx) => ({
          articulo_id: id,
          descripcion: ins.descripcion.trim(),
          costo_unitario: parseFloat(ins.costo_unitario) || 0,
          orden: idx,
        })),
      });
    }

    const updated = await prisma.articulo.findUnique({
      where: { id },
      select: {
        descripcion_standard: true,
        etapasStandard: {
          include: { tipoEtapa: { select: { nombre: true } } },
          orderBy: { orden: "asc" },
        },
        insumosStandard: { orderBy: { orden: "asc" } },
      },
    });
    res.json({
      descripcion_standard: updated.descripcion_standard || "",
      etapas: updated.etapasStandard.map((e) => ({
        id: e.id,
        tipo_etapa_id: e.tipo_etapa_id,
        tipoEtapa: { nombre: e.tipoEtapa.nombre },
        costo_unitario: e.costo_unitario,
        orden: e.orden,
      })),
      insumos: updated.insumosStandard.map((ins) => ({
        id: ins.id,
        descripcion: ins.descripcion,
        costo_unitario: ins.costo_unitario,
        orden: ins.orden,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = { articulosRouter: router };
