const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { adminOnly } = require("../middleware/auth");

const router = Router();
const prisma = new PrismaClient();

function normalize(t) {
  return {
    id: t.id,
    nombre: t.nombre,
    tiposEtapa: t.tiposEtapa.map((rel) => rel.tipo_etapa_id),
  };
}

// GET /api/talleres  → [{ id, nombre, tiposEtapa: [tipo_etapa_id, ...] }]
router.get("/", async (_req, res) => {
  try {
    const talleres = await prisma.taller.findMany({
      include: { tiposEtapa: true },
      orderBy: { nombre: "asc" },
    });
    res.json(talleres.map(normalize));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// PUT /api/talleres/sync  → [{ id, nombre, tiposEtapa: [tipo_etapa_id, ...] }]
router.put("/sync", adminOnly, async (req, res) => {
  const { lista = [] } = req.body;
  try {
    const existingIds = (
      await prisma.taller.findMany({ select: { id: true } })
    ).map((t) => t.id);

    const incomingIds = lista.map((t) => t.id);
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

    if (toDelete.length > 0) {
      await prisma.tipoEtapaTaller.deleteMany({ where: { taller_id: { in: toDelete } } });
      await prisma.taller.deleteMany({ where: { id: { in: toDelete } } });
    }

    for (const t of lista) {
      await prisma.taller.upsert({
        where: { id: t.id },
        update: { nombre: t.nombre },
        create: { id: t.id, nombre: t.nombre },
      });

      // Replace pivot associations
      await prisma.tipoEtapaTaller.deleteMany({ where: { taller_id: t.id } });
      if (t.tiposEtapa && t.tiposEtapa.length > 0) {
        await prisma.tipoEtapaTaller.createMany({
          data: t.tiposEtapa.map((tipo_etapa_id) => ({ taller_id: t.id, tipo_etapa_id })),
          skipDuplicates: true,
        });
      }
    }

    const result = await prisma.taller.findMany({
      include: { tiposEtapa: true },
      orderBy: { nombre: "asc" },
    });
    res.json(result.map(normalize));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = { talleresRouter: router };
