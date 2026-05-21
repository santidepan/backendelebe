const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { adminOnly } = require("../middleware/auth");

const router = Router();
const prisma = new PrismaClient();

// GET /api/procesos-base
router.get("/", async (_req, res) => {
  try {
    const procesos = await prisma.procesoBase.findMany({
      orderBy: { nombre: "asc" },
    });
    res.json(procesos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// PUT /api/procesos-base/sync — admin only
// Body: [{ id?, nombre, costo_unitario }]
router.put("/sync", adminOnly, async (req, res) => {
  const lista = req.body;
  if (!Array.isArray(lista)) return res.status(400).json({ error: "Se esperaba un array" });
  try {
    const existingIds = (await prisma.procesoBase.findMany({ select: { id: true } })).map((r) => r.id);
    const incomingIds = lista.filter((r) => r.id).map((r) => r.id);
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

    if (toDelete.length > 0) {
      await prisma.procesoBase.deleteMany({ where: { id: { in: toDelete } } });
    }

    for (const item of lista) {
      if (item.id) {
        await prisma.procesoBase.upsert({
          where: { id: item.id },
          update: {
            nombre: item.nombre,
            costo_unitario: parseFloat(item.costo_unitario) || 0,
          },
          create: {
            id: item.id,
            nombre: item.nombre,
            costo_unitario: parseFloat(item.costo_unitario) || 0,
          },
        });
      } else {
        await prisma.procesoBase.create({
          data: {
            nombre: item.nombre,
            costo_unitario: parseFloat(item.costo_unitario) || 0,
          },
        });
      }
    }

    const result = await prisma.procesoBase.findMany({ orderBy: { nombre: "asc" } });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = { procesosBaseRouter: router };
