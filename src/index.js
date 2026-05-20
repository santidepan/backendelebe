require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { authRouter } = require("./routes/auth");
const { unidadesRouter } = require("./routes/unidades");
const { articulosRouter } = require("./routes/articulos");
const { produccionesRouter } = require("./routes/producciones");
const { usuariosRouter } = require("./routes/usuarios");
const { authMiddleware } = require("./middleware/auth");

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || "*" }));
app.use(express.json({ limit: "5mb" }));

// Ruta pública
app.use("/api/auth", authRouter);

// Todas las rutas siguientes requieren JWT válido
app.use(authMiddleware);
app.use("/api/unidades", unidadesRouter);
app.use("/api/articulos", articulosRouter);
app.use("/api/producciones", produccionesRouter);
app.use("/api/usuarios", usuariosRouter);

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT}`);
});
