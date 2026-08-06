import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env["DATABASE_URL"];

if (!connectionString) {
  throw new Error("DATABASE_URL ist nicht gesetzt.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const orderStatuses = [
  {
    name: "Eingegangen",
    description: "Die Bestellung ist eingegangen.",
    sortOrder: 1,
  },
  {
    name: "Bestätigt",
    description: "Die Bestellung wurde bestätigt.",
    sortOrder: 2,
  },
  {
    name: "In Zubereitung",
    description: "Die Bestellung wird zubereitet.",
    sortOrder: 3,
  },
  {
    name: "Bereit",
    description: "Die Bestellung ist zur Abholung oder Auslieferung bereit.",
    sortOrder: 4,
  },
  {
    name: "Abgeschlossen",
    description: "Die Bestellung wurde abgeschlossen.",
    sortOrder: 5,
  },
  {
    name: "Storniert",
    description: "Die Bestellung wurde storniert.",
    sortOrder: 6,
  },
];

const paymentMethods = [
  {
    name: "Barzahlung",
    isOnlinePayment: false,
    isActive: true,
  },
  {
    name: "PayPal",
    isOnlinePayment: true,
    isActive: true,
  },
  {
    name: "Kreditkarte",
    isOnlinePayment: true,
    isActive: true,
  },
];

async function main(): Promise<void> {
  for (const status of orderStatuses) {
    await prisma.orderStatus.upsert({
      where: { name: status.name },
      update: status,
      create: status,
    });
  }

  for (const paymentMethod of paymentMethods) {
    await prisma.paymentMethod.upsert({
      where: { name: paymentMethod.name },
      update: paymentMethod,
      create: paymentMethod,
    });
  }

  console.log(
    `${orderStatuses.length} Bestellstatus und ` +
      `${paymentMethods.length} Zahlungsarten wurden angelegt oder aktualisiert.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error("Prisma-Seed fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });