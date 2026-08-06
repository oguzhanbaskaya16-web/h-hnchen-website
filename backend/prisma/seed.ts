import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env['DATABASE_URL'];

if (!connectionString) {
  throw new Error('DATABASE_URL ist nicht gesetzt.');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const orderStatuses = [
  {
    name: 'Eingegangen',
    description: 'Die Bestellung ist eingegangen.',
    sortOrder: 1,
  },
  {
    name: 'Bestätigt',
    description: 'Die Bestellung wurde bestätigt.',
    sortOrder: 2,
  },
  {
    name: 'In Zubereitung',
    description: 'Die Bestellung wird zubereitet.',
    sortOrder: 3,
  },
  {
    name: 'Bereit',
    description: 'Die Bestellung ist zur Abholung oder Auslieferung bereit.',
    sortOrder: 4,
  },
  {
    name: 'Abgeschlossen',
    description: 'Die Bestellung wurde abgeschlossen.',
    sortOrder: 5,
  },
  {
    name: 'Storniert',
    description: 'Die Bestellung wurde storniert.',
    sortOrder: 6,
  },
];

const paymentMethods = [
  {
    name: 'Barzahlung',
    isOnlinePayment: false,
    isActive: true,
  },
  {
    name: 'PayPal',
    isOnlinePayment: true,
    isActive: true,
  },
  {
    name: 'Kreditkarte',
    isOnlinePayment: true,
    isActive: true,
  },
];

const restaurantData = {
  name: 'IDIL Hähnchengrill',
  street: 'Musterstraße',
  houseNumber: '1',
  postalCode: '12345',
  city: 'Musterstadt',
  phone: '+49 123 4567890',
  email: 'info@idil-haehnchengrill.example',
  description: 'Frisch gegrillte Hähnchenspezialitäten zur Abholung.',
};

const weekdays = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
];

const socialMediaLinks = [
  {
    platform: 'INSTAGRAM',
    url: 'https://example.com/instagram',
  },
  {
    platform: 'FACEBOOK',
    url: 'https://example.com/facebook',
  },
  {
    platform: 'TIKTOK',
    url: 'https://example.com/tiktok',
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

  const existingRestaurant = await prisma.restaurant.findFirst({
    where: {
      name: restaurantData.name,
    },
  });

  const openingHours = weekdays.map((weekday) => ({
    weekday,
    opensAt: new Date('1970-01-01T00:00:00.000Z'),
    closesAt: new Date('1970-01-01T23:59:00.000Z'),
  }));

  if (existingRestaurant) {
    await prisma.restaurant.update({
      where: {
        id: existingRestaurant.id,
      },
      data: {
        ...restaurantData,
        openingHours: {
          deleteMany: {},
          create: openingHours,
        },
        socialMediaLinks: {
          deleteMany: {},
          create: socialMediaLinks,
        },
      },
    });
  } else {
    await prisma.restaurant.create({
      data: {
        ...restaurantData,
        openingHours: {
          create: openingHours,
        },
        socialMediaLinks: {
          create: socialMediaLinks,
        },
      },
    });
  }

  console.log(
    `${orderStatuses.length} Bestellstatus, ` +
      `${paymentMethods.length} Zahlungsarten, ` +
      `${weekdays.length} Öffnungszeiten und ` +
      `${socialMediaLinks.length} Social-Media-Links wurden angelegt oder aktualisiert.`,
  );
}

main()
  .catch((error: unknown) => {
    console.error('Prisma-Seed fehlgeschlagen:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
