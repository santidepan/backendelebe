const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const { adminOnly } = require("../middleware/auth");

const router = Router();
const prisma = new PrismaClient();

// GET /api/pagos?desde=&hasta=&taller_id=&solo_pendientes=true
router.get("/", async (req, res) => {
  const { desde, hasta, taller_id, solo_pendientes } = req.query;
  const soloPendientes = solo_pendientes === "true";

  try {
    const where = { estado: "completada" };

    if (soloPendientes) {
      where.pagada = false;
    } else {
      if (desde || hasta) {
        where.fecha_cierre = {};
        if (desde) where.fecha_cierre.gte = desde;
        if (hasta) where.fecha_cierre.lte = hasta;
      }
    }

    if (taller_id) {
      where.taller_id = taller_id;
    }

    const etapas = await prisma.etapa.findMany({
      where,
      include: {
        tipoEtapa: { select: { nombre: true } },
        taller: { select: { nombre: true } },
        produccion: {
          select: {
            id: true,
            nombre: true,
            cantidad_prendas: true,
            unidad: { select: { nombre: true } },
          },
        },
      },
      orderBy: [{ fecha_cierre: "asc" }],
    });

    const result = etapas.map((et) => ({
      id: et.id,
      nombre: et.nombre || (et.tipoEtapa?.nombre || ""),
      tipo_etapa_id: et.tipo_etapa_id,
      taller_id: et.taller_id,
      taller_nombre: et.taller?.nombre || et.taller_proveedor || "",
      fecha_inicio: et.fecha_inicio,
      fecha_cierre: et.fecha_cierre,
      estado: et.estado,
      costo_total: et.costo_total,
      notas: et.notas,
      pagada: et.pagada,
      fecha_pago: et.fecha_pago,
      produccion_id: et.produccion_id,
      produccion: {
        id: et.produccion.id,
        nombre: et.produccion.nombre,
        cantidad_prendas: et.produccion.cantidad_prendas,
        unidad: et.produccion.unidad?.nombre || "",
      },
    }));

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// PUT /api/pagos/marcar — admin only
router.put("/marcar", adminOnly, async (req, res) => {
  const { etapa_ids, pagada, fecha_pago } = req.body;
  if (!Array.isArray(etapa_ids) || etapa_ids.length === 0) {
    return res.status(400).json({ error: "etapa_ids requerido" });
  }
  try {
    const result = await prisma.etapa.updateMany({
      where: { id: { in: etapa_ids } },
      data: {
        pagada: Boolean(pagada),
        fecha_pago: fecha_pago || null,
      },
    });
    res.json({ updated: result.count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = { pagosRouter: router };
