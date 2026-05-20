const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  // Unidades
  const textil = await prisma.unidad.upsert({
    where: { nombre: "Textil" },
    update: {},
    create: { nombre: "Textil" },
  });

  const agencia = await prisma.unidad.upsert({
    where: { nombre: "Agencia" },
    update: {},
    create: { nombre: "Agencia" },
  });

  // Artículos Textil por defecto
  const articulosTextil = [
    { id: "textil_remera", label: "Remera" },
    { id: "textil_chomba", label: "Chomba" },
    { id: "textil_buzo", label: "Buzo cuello redondo" },
    { id: "textil_campera", label: "Campera" },
    { id: "textil_pantalon", label: "Pantalón" },
    { id: "textil_camperon", label: "Camperón" },
  ];

  for (const art of articulosTextil) {
    await prisma.articulo.upsert({
      where: { id: art.id },
      update: { label: art.label },
      create: { id: art.id, label: art.label, unidad_id: textil.id },
    });
  }

  // Artículos Agencia por defecto
  const articulosAgencia = [
    { id: "agencia_fotografia", label: "Fotografía" },
    { id: "agencia_impresion", label: "Impresión" },
    { id: "agencia_campana_digital", label: "Campaña Digital" },
  ];

  for (const art of articulosAgencia) {
    await prisma.articulo.upsert({
      where: { id: art.id },
      update: { label: art.label },
      create: { id: art.id, label: art.label, unidad_id: agencia.id },
    });
  }

  // Usuario admin inicial
  const adminUsername = process.env.ADMIN_USERNAME || "admin";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

  await prisma.usuario.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      username: adminUsername,
      password: await bcrypt.hash(adminPassword, 10),
      nombre: "Administrador",
      role: "admin",
    },
  });

  console.log("Seed completado.");
  console.log(`  Unidades: Textil (id=${textil.id}), Agencia (id=${agencia.id})`);
  console.log(`  Artículos: ${articulosTextil.length} Textil, ${articulosAgencia.length} Agencia`);
  console.log(`  Admin: ${adminUsername}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
