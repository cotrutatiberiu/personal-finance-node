import { prisma } from "../src/db/client.js";

async function main() {
  // Roles
  const roles = ["USER", "MODERATOR", "ADMIN"];
  for (const name of roles) {
    await prisma.roles.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  // Currencies
  const currencies = ["EUR", "USD", "RON"];
  for (const name of currencies) {
    await prisma.currencies.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
