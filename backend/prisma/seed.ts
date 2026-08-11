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

const menuCategories = [
  {
    name: 'Hähnchen',
    description: 'Frisch gegrillte Hähnchenspezialitäten.',
    products: [
      {
        name: 'Halbes Hähnchen',
        shortDescription: 'Saftig, knusprig und perfekt gewürzt.',
        price: 7.5,
        preparationTimeMinutes: 20,
        isHighlight: true,
      },
      {
        name: 'Ganzes Hähnchen',
        shortDescription: 'Für den großen Hunger – frisch vom Grill.',
        price: 13.9,
        preparationTimeMinutes: 25,
        isHighlight: true,
      },
      {
        name: 'Hähnchen mit Pommes',
        shortDescription: 'Halbes Hähnchen mit goldbraunen Pommes.',
        price: 11.5,
        preparationTimeMinutes: 25,
        isHighlight: true,
      },
      {
        name: 'Hähnchenflügel',
        shortDescription: 'Knusprig gegrillte Hähnchenflügel mit Dip.',
        price: 8.9,
        preparationTimeMinutes: 20,
        isHighlight: false,
      },
      {
        name: 'Hähnchenstreifen',
        shortDescription: 'Zarte Hähnchenstreifen mit einer Sauce nach Wahl.',
        price: 8.5,
        preparationTimeMinutes: 15,
        isHighlight: false,
      },
    ],
  },
  {
    name: 'Menüs & Angebote',
    description: 'Kombinierte Angebote für eine oder mehrere Personen.',
    products: [
      {
        name: 'Hähnchen-Menü',
        shortDescription:
          'Halbes Hähnchen mit Pommes, einer Sauce und einem Getränk.',
        price: 13.9,
        preparationTimeMinutes: 25,
        isHighlight: true,
      },
      {
        name: 'Ganzes-Hähnchen-Menü',
        shortDescription:
          'Ganzes Hähnchen mit großer Pommes, zwei Saucen und zwei Getränken.',
        price: 21.9,
        preparationTimeMinutes: 30,
        isHighlight: false,
      },
      {
        name: 'Familienangebot',
        shortDescription:
          '2 ganze Hähnchen, 2 große Pommes, 3 Saucen und 2 Getränke.',
        price: 24.9,
        preparationTimeMinutes: 35,
        isHighlight: true,
      },
      {
        name: 'Flügel-Menü',
        shortDescription:
          'Hähnchenflügel mit Pommes, einer Sauce und einem Getränk.',
        price: 12.9,
        preparationTimeMinutes: 25,
        isHighlight: false,
      },
    ],
  },
  {
    name: 'Beilagen',
    description: 'Passende Beilagen zu unseren Grillgerichten.',
    products: [
      {
        name: 'Kleine Pommes',
        shortDescription: 'Kleine Portion knuspriger Pommes.',
        price: 2.5,
        preparationTimeMinutes: 10,
        isHighlight: false,
      },
      {
        name: 'Große Pommes',
        shortDescription: 'Große Portion knuspriger, goldbrauner Pommes.',
        price: 3.5,
        preparationTimeMinutes: 10,
        isHighlight: false,
      },
      {
        name: 'Süßkartoffel-Pommes',
        shortDescription: 'Knusprige Pommes aus Süßkartoffeln.',
        price: 4.5,
        preparationTimeMinutes: 12,
        isHighlight: false,
      },
      {
        name: 'Krautsalat',
        shortDescription: 'Frischer, cremiger Krautsalat.',
        price: 3,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'Gemischter Salat',
        shortDescription: 'Frischer Salat mit Tomaten, Gurken und Dressing.',
        price: 4.5,
        preparationTimeMinutes: 5,
        isHighlight: false,
      },
      {
        name: 'Fladenbrot',
        shortDescription: 'Frisch aufgebackenes Fladenbrot.',
        price: 2,
        preparationTimeMinutes: 5,
        isHighlight: false,
      },
    ],
  },
  {
    name: 'Saucen',
    description: 'Saucen für Hähnchen und Beilagen.',
    products: [
      {
        name: 'Knoblauchsauce',
        shortDescription: 'Cremig und würzig.',
        price: 1,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'Cocktailsauce',
        shortDescription: 'Fruchtig und mild.',
        price: 1,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'BBQ-Sauce',
        shortDescription: 'Rauchig und herzhaft.',
        price: 1,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'Currysauce',
        shortDescription: 'Fruchtig-würzige Sauce mit feiner Currynote.',
        price: 1,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'Scharfe Sauce',
        shortDescription: 'Pikante Sauce für alle, die es schärfer mögen.',
        price: 1,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
    ],
  },
  {
    name: 'Getränke',
    description: 'Erfrischende alkoholfreie Getränke.',
    products: [
      {
        name: 'Coca-Cola',
        shortDescription: 'Erfrischungsgetränk mit Koffein.',
        price: 2.5,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'Coca-Cola Zero',
        shortDescription: 'Zuckerfreies Erfrischungsgetränk mit Koffein.',
        price: 2.5,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'Fanta',
        shortDescription: 'Fruchtiges Orangen-Erfrischungsgetränk.',
        price: 2.5,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'Sprite',
        shortDescription:
          'Erfrischungsgetränk mit Zitronen-Limetten-Geschmack.',
        price: 2.5,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'Ayran',
        shortDescription: 'Erfrischendes türkisches Joghurtgetränk.',
        price: 2,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'Mineralwasser',
        shortDescription: 'Natürliches Mineralwasser.',
        price: 2,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
    ],
  },
  {
    name: 'Desserts',
    description: 'Ein süßer Abschluss nach dem Essen.',
    products: [
      {
        name: 'Baklava',
        shortDescription: 'Süßes Blätterteiggebäck mit Nüssen und Zuckersirup.',
        price: 3.5,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'Milchreis',
        shortDescription: 'Cremiger Milchreis mit Zimt.',
        price: 3.5,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'Schokoladenmuffin',
        shortDescription: 'Saftiger Muffin mit Schokoladenstückchen.',
        price: 2.9,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
      {
        name: 'Kinder-Dessert',
        shortDescription: 'Kleine süße Überraschung für Kinder.',
        price: 2.5,
        preparationTimeMinutes: 0,
        isHighlight: false,
      },
    ],
  },
];

async function findProductByName(name: string) {
  const product = await prisma.product.findFirst({
    where: { name },
  });

  if (!product) {
    throw new Error(`Seed-Produkt "${name}" wurde nicht gefunden.`);
  }

  return product;
}

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

  let categoryCount = 0;
  let productCount = 0;

  for (const categoryData of menuCategories) {
    const existingCategory = await prisma.productCategory.findFirst({
      where: {
        name: categoryData.name,
      },
    });

    const category = existingCategory
      ? await prisma.productCategory.update({
          where: {
            id: existingCategory.id,
          },
          data: {
            description: categoryData.description,
          },
        })
      : await prisma.productCategory.create({
          data: {
            name: categoryData.name,
            description: categoryData.description,
          },
        });

    categoryCount += 1;

    for (const productData of categoryData.products) {
      const existingProduct = await prisma.product.findFirst({
        where: {
          categoryId: category.id,
          name: productData.name,
        },
      });

      const productValues = {
        shortDescription: productData.shortDescription,
        price: productData.price,
        preparationTimeMinutes: productData.preparationTimeMinutes,
        isHighlight: productData.isHighlight,
        isAvailable: true,
      };

      if (existingProduct) {
        await prisma.product.update({
          where: {
            id: existingProduct.id,
          },
          data: productValues,
        });
      } else {
        await prisma.product.create({
          data: {
            categoryId: category.id,
            name: productData.name,
            ...productValues,
          },
        });
      }

      productCount += 1;
    }
  }

  const halfChicken = await findProductByName('Halbes Hähnchen');
  const largeFries = await findProductByName('Große Pommes');
  const coleslaw = await findProductByName('Krautsalat');
  const garlicSauce = await findProductByName('Knoblauchsauce');
  const bbqSauce = await findProductByName('BBQ-Sauce');

  const sideGroup = await prisma.productOptionGroup.upsert({
    where: {
      mainProductId_optionType: {
        mainProductId: halfChicken.id,
        optionType: 'SIDE',
      },
    },
    update: {
      name: 'Beilage',
      minSelections: 0,
      maxSelections: 2,
      sortOrder: 1,
    },
    create: {
      mainProductId: halfChicken.id,
      name: 'Beilage',
      optionType: 'SIDE',
      minSelections: 0,
      maxSelections: 2,
      sortOrder: 1,
    },
  });

  const sauceGroup = await prisma.productOptionGroup.upsert({
    where: {
      mainProductId_optionType: {
        mainProductId: halfChicken.id,
        optionType: 'SAUCE',
      },
    },
    update: {
      name: 'Sauce',
      minSelections: 0,
      maxSelections: 1,
      sortOrder: 2,
    },
    create: {
      mainProductId: halfChicken.id,
      name: 'Sauce',
      optionType: 'SAUCE',
      minSelections: 0,
      maxSelections: 1,
      sortOrder: 2,
    },
  });

  const productOptions = [
    {
      optionGroupId: sideGroup.id,
      optionProductId: largeFries.id,
      surcharge: 3.5,
      sortOrder: 1,
    },
    {
      optionGroupId: sideGroup.id,
      optionProductId: coleslaw.id,
      surcharge: 3,
      sortOrder: 2,
    },
    {
      optionGroupId: sauceGroup.id,
      optionProductId: garlicSauce.id,
      surcharge: 1,
      sortOrder: 1,
    },
    {
      optionGroupId: sauceGroup.id,
      optionProductId: bbqSauce.id,
      surcharge: 1,
      sortOrder: 2,
    },
  ];

  for (const productOption of productOptions) {
    await prisma.productOption.upsert({
      where: {
        mainProductId_optionProductId: {
          mainProductId: halfChicken.id,
          optionProductId: productOption.optionProductId,
        },
      },
      update: {
        optionGroupId: productOption.optionGroupId,
        surcharge: productOption.surcharge,
        sortOrder: productOption.sortOrder,
      },
      create: {
        mainProductId: halfChicken.id,
        optionGroupId: productOption.optionGroupId,
        optionProductId: productOption.optionProductId,
        surcharge: productOption.surcharge,
        sortOrder: productOption.sortOrder,
      },
    });
  }

  console.log(
    `${categoryCount} Produktkategorien und ` +
      `${productCount} Produkte wurden angelegt oder aktualisiert.`,
  );

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
