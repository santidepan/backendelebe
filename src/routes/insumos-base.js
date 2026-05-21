const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { adminOnly } = require("../middleware/auth");

const router = Router();
const prisma = new PrismaClient();

// GET /api/insumos-base
router.get("/", async (_req, res) => {
  try {
    const insumos = await prisma.insumoBase.findMany({
      orderBy: { nombre: "asc" },
    });
    res.json(insumos);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// PUT /api/insumos-base/sync — admin only
// Body: [{ id?, nombre, unidad, precio_unitario }]
router.put("/sync", adminOnly, async (req, res) => {
  const lista = req.body;
  if (!Array.isArray(lista)) return res.status(400).json({ error: "Se esperaba un array" });
  try {
    const existingIds = (await prisma.insumoBase.findMany({ select: { id: true } })).map((r) => r.id);
    const incomingIds = lista.filter((r) => r.id).map((r) => r.id);
    const toDelete = existingIds.filter((id) => !incomingIds.includes(id));

    if (toDelete.length > 0) {
      await prisma.insumoBase.deleteMany({ where: { id: { in: toDelete } } });
    }

    for (const item of lista) {
      if (item.id) {
        await prisma.insumoBase.upsert({
          where: { id: item.id },
          update: {
            nombre: item.nombre,
            unidad: item.unidad,
            precio_unitario: parseFloat(item.precio_unitario) || 0,
          },
          create: {
            id: item.id,
            nombre: item.nombre,
            unidad: item.unidad || "",
            precio_unitario: parseFloat(item.precio_unitario) || 0,
          },
        });
      } else {
        await prisma.insumoBase.create({
          data: {
            nombre: item.nombre,
            unidad: item.unidad || "",
            precio_unitario: parseFloat(item.precio_unitario) || 0,
          },
        });
      }
    }

    const result = await prisma.insumoBase.findMany({ orderBy: { nombre: "asc" } });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = { insumosBaseRouter: router };
