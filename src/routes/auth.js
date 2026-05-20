const { Router } = require("express");
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const router = Router();
const prisma = new PrismaClient();

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Faltan datos" });
  }
  try {
    const user = await prisma.usuario.findUnique({ where: { username: username.trim() } });
    if (!user) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: "Usuario o contraseña incorrectos" });
    }
    const payload = { id: user.id, username: user.username, nombre: user.nombre, role: user.role };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: "30d" });
    res.json({ token, user: payload });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error interno" });
  }
});

module.exports = { authRouter: router };
