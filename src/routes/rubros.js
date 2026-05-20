const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { adminOnly } = require("../middleware/auth");

const router = Router();
const prisma = new PrismaClient();

// GET /api/rubros  → { textil: [...], agencia: [...] }
router.get("/", async (_req, res) => {
  try {
    const [textil, agencia] = await Promise.all([
      prisma.rubroInsumo.findMany({ where: { unidad: "Textil" }, orderBy: { label: "asc" } }),
      prisma.rubroInsumo.findMany({ where: { unidad: "Agencia" }, orderBy: { label: "asc" } }),
    ]);
    res.json({ textil, agencia });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// PUT /api/rubros/sync  → { textil: [{id, label}], agencia: [{id, label}] }
router.put("/sync", adminOnly, async (req, res) => {
  const { textil = [], agencia = [] } = req.body;
  try {
    const syncUnit = async (lista, unidad) => {
      const existingIds = (
        await prisma.rubroInsumo.findMany({ where: { unidad }, select: { id: true } })
      ).map((r) => r.id);

      const incomingIds = lista.map((r) => r.id);
      const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

      if (toDelete.length > 0) {
        await prisma.rubroInsumo.deleteMany({ where: { id: { in: toDelete } } });
      }

      for (const r of lista) {
        await prisma.rubroInsumo.upsert({
          where: { id: r.id },
          update: { label: r.label },
          create: { id: r.id, label: r.label, unidad },
        });
      }

      return prisma.rubroInsumo.findMany({ where: { unidad }, orderBy: { label: "asc" } });
    };

    const [resultTextil, resultAgencia] = await Promise.all([
      syncUnit(textil, "Textil"),
      syncUnit(agencia, "Agencia"),
    ]);

    res.json({ textil: resultTextil, agencia: resultAgencia });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = { rubrosRouter: router };
