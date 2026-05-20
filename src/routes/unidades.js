const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");

const router = Router();
const prisma = new PrismaClient();

router.get("/", async (_req, res) => {
  try {
    const unidades = await prisma.unidad.findMany({ orderBy: { id: "asc" } });
    res.json(unidades);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = { unidadesRouter: router };
