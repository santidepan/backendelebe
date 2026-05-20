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

  // Rubros de insumos por defecto
  const rubrosTextil = [
    { id: "rubro_textil_tela", label: "Tela / Textil", unidad: "Textil" },
    { id: "rubro_textil_insumos", label: "Insumos", unidad: "Textil" },
    { id: "rubro_textil_mano_obra", label: "Mano de obra", unidad: "Textil" },
    { id: "rubro_textil_servicios", label: "Servicios externos", unidad: "Textil" },
    { id: "rubro_textil_logistica", label: "Logística", unidad: "Textil" },
  ];

  const rubrosAgencia = [
    { id: "rubro_agencia_proveedor", label: "Proveedor externo", unidad: "Agencia" },
    { id: "rubro_agencia_comision", label: "Comisión", unidad: "Agencia" },
    { id: "rubro_agencia_otro", label: "Otro", unidad: "Agencia" },
  ];

  for (const r of [...rubrosTextil, ...rubrosAgencia]) {
    await prisma.rubroInsumo.upsert({
      where: { id: r.id },
      update: { label: r.label },
      create: r,
    });
  }

  // Tipos de etapa por defecto
  const tiposEtapa = [
    { id: "etapa_corte", nombre: "Corte" },
    { id: "etapa_costura", nombre: "Costura" },
    { id: "etapa_bordado", nombre: "Bordado" },
    { id: "etapa_estampado", nombre: "Estampado" },
    { id: "etapa_terminacion", nombre: "Terminación" },
    { id: "etapa_control_calidad", nombre: "Control de calidad" },
    { id: "etapa_entrega", nombre: "Entrega" },
  ];

  for (const te of tiposEtapa) {
    await prisma.tipoEtapa.upsert({
      where: { id: te.id },
      update: { nombre: te.nombre },
      create: te,
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
  console.log(`  Rubros: ${rubrosTextil.length} Textil, ${rubrosAgencia.length} Agencia`);
  console.log(`  Tipos de etapa: ${tiposEtapa.length}`);
  console.log(`  Admin: ${adminUsername}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
