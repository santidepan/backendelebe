const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const { adminOnly } = require("../middleware/auth");

const router = Router();
const prisma = new PrismaClient();

const safeUser = (u) => ({ id: u.id, username: u.username, nombre: u.nombre, role: u.role });

router.get("/", adminOnly, async (_req, res) => {
  try {
    const users = await prisma.usuario.findMany({ orderBy: { nombre: "asc" } });
    res.json(users.map(safeUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

// Recibe { lista: [...usuarios] }
// Los usuarios nuevos tienen _newPassword (plain text)
// Los existentes actualizan role/nombre; si traen _newPassword se rehashea la contraseña
// Los que desaparecen de la lista se eliminan (excepto el admin que hace la request)
router.put("/sync", adminOnly, async (req, res) => {
  const { lista } = req.body;
  if (!Array.isArray(lista)) return res.status(400).json({ error: "Lista inválida" });

  try {
    const currentUsers = await prisma.usuario.findMany();
    const currentIds = currentUsers.map((u) => u.id);
    const incomingIds = lista.map((u) => u.id);

    // Eliminar usuarios que no están en la lista (nunca al admin que hace la request)
    const toDelete = currentIds.filter(
      (id) => !incomingIds.includes(id) && id !== req.user.id
    );
    if (toDelete.length > 0) {
      await prisma.usuario.deleteMany({ where: { id: { in: toDelete } } });
    }

    // Upsert cada usuario de la lista
    for (const u of lista) {
      const exists = currentIds.includes(u.id);
      if (exists) {
        const updateData = { nombre: u.nombre, role: u.role };
        if (u._newPassword) {
          updateData.password = await bcrypt.hash(u._newPassword, 10);
        }
        await prisma.usuario.update({ where: { id: u.id }, data: updateData });
      } else {
        if (!u._newPassword) continue; // no se puede crear un usuario sin contraseña
        await prisma.usuario.create({
          data: {
            id: u.id,
            username: u.username,
            password: await bcrypt.hash(u._newPassword, 10),
            nombre: u.nombre || u.username,
            role: u.role || "user",
          },
        });
      }
    }

    const result = await prisma.usuario.findMany({ orderBy: { nombre: "asc" } });
    res.json(result.map(safeUser));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = { usuariosRouter: router };
