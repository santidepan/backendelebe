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

module.exports = { articulosRouter: router };
