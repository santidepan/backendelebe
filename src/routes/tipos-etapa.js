const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { adminOnly } = require("../middleware/auth");

const router = Router();
const prisma = new PrismaClient();

// GET /api/tipos-etapa  → [{ id, nombre }]
router.get("/", async (_req, res) => {
  try {
    const tipos = await prisma.tipoEtapa.findMany({ orderBy: { nombre: "asc" } });
    res.json(tipos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// PUT /api/tipos-etapa/sync  → [{ id, nombre }]
router.put("/sync", adminOnly, async (req, res) => {
  const { lista = [] } = req.body;
  try {
    const existingIds = (
      await prisma.tipoEtapa.findMany({ select: { id: true } })
    ).map((t) => t.id);

    const incomingIds = lista.map((t) => t.id);
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

    if (toDelete.length > 0) {
      // Remove pivot rows first to avoid FK constraint errors
      await prisma.tipoEtapaTaller.deleteMany({ where: { tipo_etapa_id: { in: toDelete } } });
      await prisma.tipoEtapa.deleteMany({ where: { id: { in: toDelete } } });
    }

    for (const t of lista) {
      await prisma.tipoEtapa.upsert({
        where: { id: t.id },
        update: { nombre: t.nombre },
        create: { id: t.id, nombre: t.nombre },
      });
    }

    const result = await prisma.tipoEtapa.findMany({ orderBy: { nombre: "asc" } });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = { tiposEtapaRouter: router };
