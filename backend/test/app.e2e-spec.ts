import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { PrismaExceptionFilter } from '../src/common/filters/prisma-exception.filter';

import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaClient;
  let orderCartId: string;
  let orderNumber: string;
  let paymentMethodId: number;

  function getValidRequestedTime(): string {
    const requestedTime = new Date();

    requestedTime.setDate(requestedTime.getDate() + 1);
    requestedTime.setHours(12, 0, 0, 0);

    return requestedTime.toISOString();
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    const connectionString = process.env['DATABASE_URL'];

    if (!connectionString) {
      throw new Error('DATABASE_URL ist nicht gesetzt.');
    }

    const adapter = new PrismaPg({ connectionString });
    prisma = new PrismaClient({ adapter });

    const paymentMethod = await prisma.paymentMethod.findFirstOrThrow({
      where: {
        isActive: true,
      },
      orderBy: {
        id: 'asc',
      },
    });

    paymentMethodId = paymentMethod.id;

    app = moduleFixture.createNestApplication();

    app.useGlobalFilters(new PrismaExceptionFilter());

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );

    app.setGlobalPrefix('api/v1');

    app.enableShutdownHooks();

    await app.init();
  });

  async function getConfiguredProduct() {
    const product = await prisma.product.findFirstOrThrow({
      where: {
        name: 'Halbes Hähnchen',
      },
      include: {
        optionGroups: {
          orderBy: {
            sortOrder: 'asc',
          },
          include: {
            options: {
              orderBy: {
                sortOrder: 'asc',
              },
            },
          },
        },
      },
    });

    const optionIds = product.optionGroups.map((group) => {
      const option = group.options[0];

      if (!option) {
        throw new Error(
          `Die Optionsgruppe "${group.name}" enthält keine Produktoption.`,
        );
      }

      return option.id;
    });

    const alternativeOptionIds = product.optionGroups.map((group) => {
      const option = group.options[1];

      if (!option) {
        throw new Error(
          `Die Optionsgruppe "${group.name}" enthält keine zweite Produktoption.`,
        );
      }

      return option.id;
    });

    return {
      product,
      optionIds,
      alternativeOptionIds,
    };
  }

  it('/api/v1/health (GET) prüft Anwendung und Datenbank', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({
        status: 'ok',
        database: 'connected',
      });
  });

  it('/api/v1/restaurant (GET) liefert öffentliche Restaurantdaten', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/restaurant')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toMatchObject({
          name: 'IDIL Hähnchengrill',
          phone: '+49 123 4567890',
          email: 'info@idil-haehnchengrill.example',
          description: 'Frisch gegrillte Hähnchenspezialitäten zur Abholung.',
          address: {
            street: 'Musterstraße',
            houseNumber: '1',
            postalCode: '12345',
            city: 'Musterstadt',
          },
          ordering: {
            pickupAvailable: true,
            deliveryAvailable: false,
            paymentMethods: ['CASH'],
          },
        });

        expect(body.openingHours).toHaveLength(7);
        expect(body.socialLinks).toHaveLength(3);

        expect(body.openingHours[0]).toHaveProperty('dayOfWeek');
        expect(body.openingHours[0]).toHaveProperty('opensAt');
        expect(body.openingHours[0]).toHaveProperty('closesAt');

        expect(body).not.toHaveProperty('id');
        expect(body.openingHours[0]).not.toHaveProperty('restaurantId');
        expect(body.socialLinks[0]).not.toHaveProperty('restaurantId');
      });
  });

  it('/api/v1/menu (GET) liefert Kategorien und verfügbare Produkte', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/menu')
      .expect(200)
      .expect(({ body }) => {
        expect(body).toHaveProperty('categories');
        expect(body.categories).toHaveLength(6);

        const products = body.categories.flatMap(
          (category: { products: unknown[] }) => category.products,
        );

        expect(products).toHaveLength(30);

        const chickenCategory = body.categories.find(
          (category: { name: string }) => category.name === 'Hähnchen',
        );

        expect(chickenCategory).toBeDefined();
        expect(chickenCategory.products.length).toBeGreaterThan(0);

        expect(chickenCategory.products[0]).toMatchObject({
          name: 'Halbes Hähnchen',
          price: '7.50',
          isHighlight: true,
        });

        expect(typeof chickenCategory.products[0].price).toBe('string');
        expect(chickenCategory.products[0].price).toMatch(/^\d+\.\d{2}$/);

        const productWithOptions = products.find(
          (product: { optionGroups?: unknown[] }) =>
            Array.isArray(product.optionGroups) &&
            product.optionGroups.length > 0,
        );

        expect(productWithOptions).toBeDefined();

        const optionGroup = productWithOptions.optionGroups[0];

        expect(optionGroup).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          optionType: expect.any(String),
          minSelections: expect.any(Number),
          maxSelections: expect.any(Number),
        });

        expect(optionGroup.options.length).toBeGreaterThan(0);
        expect(optionGroup.maxSelections).toBeGreaterThanOrEqual(
          optionGroup.minSelections,
        );

        const option = optionGroup.options[0];

        expect(option).toMatchObject({
          id: expect.any(Number),
          productId: expect.any(Number),
          name: expect.any(String),
          surcharge: expect.any(String),
        });

        expect(option.surcharge).toMatch(/^\d+\.\d{2}$/);

        expect(chickenCategory.products[0]).not.toHaveProperty('categoryId');
        expect(chickenCategory.products[0]).not.toHaveProperty('isAvailable');
      });
  });

  describe('/api/v1/products/:productId (GET)', () => {
    it('liefert vollständige Details eines verfügbaren Produkts', async () => {
      const product = await prisma.product.findFirstOrThrow({
        where: {
          name: 'Halbes Hähnchen',
          isAvailable: true,
        },
        include: {
          category: true,
          optionGroups: {
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            include: {
              options: {
                where: {
                  optionProduct: {
                    isAvailable: true,
                  },
                },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
                include: {
                  optionProduct: true,
                },
              },
            },
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${product.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: product.id,
        name: product.name,
        shortDescription: product.shortDescription,
        description: product.description,
        price: product.price.toFixed(2),
        image: product.image,
        preparationTimeMinutes: product.preparationTimeMinutes,
        allergenInformation: product.allergenInformation,
        isHighlight: product.isHighlight,
        isAvailable: true,
        category: {
          id: product.category.id,
          name: product.category.name,
        },
      });

      expect(response.body.price).toMatch(/^\d+\.\d{2}$/);
      expect(response.body.optionGroups).toHaveLength(
        product.optionGroups.length,
      );
      expect(response.body.recommendations).toEqual(expect.any(Array));

      expect(
        response.body.optionGroups.map((group: { id: number }) => group.id),
      ).toEqual(product.optionGroups.map((group) => group.id));

      for (const group of response.body.optionGroups) {
        expect(group).toMatchObject({
          id: expect.any(Number),
          name: expect.any(String),
          optionType: expect.any(String),
          minSelections: expect.any(Number),
          maxSelections: expect.any(Number),
          options: expect.any(Array),
        });

        for (const option of group.options) {
          expect(option).toMatchObject({
            id: expect.any(Number),
            productId: expect.any(Number),
            name: expect.any(String),
            surcharge: expect.any(String),
            isAvailable: true,
          });

          expect(option.surcharge).toMatch(/^\d+\.\d{2}$/);
        }
      }

      expect(response.body).not.toHaveProperty('categoryId');
    });

    it('liefert Optionsgruppen und Optionen in der gespeicherten Reihenfolge', async () => {
      const product = await prisma.product.findFirstOrThrow({
        where: {
          name: 'Halbes Hähnchen',
          isAvailable: true,
        },
        include: {
          optionGroups: {
            orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
            include: {
              options: {
                where: {
                  optionProduct: {
                    isAvailable: true,
                  },
                },
                orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
              },
            },
          },
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/products/${product.id}`)
        .expect(200);

      expect(
        response.body.optionGroups.map((group: { id: number }) => group.id),
      ).toEqual(product.optionGroups.map((group) => group.id));

      for (const [index, group] of product.optionGroups.entries()) {
        expect(
          response.body.optionGroups[index].options.map(
            (option: { id: number }) => option.id,
          ),
        ).toEqual(group.options.map((option) => option.id));
      }
    });

    it('filtert ein deaktiviertes Optionsprodukt heraus', async () => {
      const product = await prisma.product.findFirstOrThrow({
        where: {
          name: 'Halbes Hähnchen',
          isAvailable: true,
        },
        include: {
          optionGroups: {
            include: {
              options: {
                include: {
                  optionProduct: true,
                },
              },
            },
          },
        },
      });

      const selectedOption = product.optionGroups
        .flatMap((group) => group.options)
        .find((option) => option.optionProduct.isAvailable);

      if (!selectedOption) {
        throw new Error(
          'Für den Test wurde kein verfügbares Optionsprodukt gefunden.',
        );
      }

      const originalAvailability = selectedOption.optionProduct.isAvailable;

      try {
        await prisma.product.update({
          where: {
            id: selectedOption.optionProductId,
          },
          data: {
            isAvailable: false,
          },
        });

        const response = await request(app.getHttpServer())
          .get(`/api/v1/products/${product.id}`)
          .expect(200);

        const returnedProductIds = response.body.optionGroups.flatMap(
          (group: { options: Array<{ productId: number }> }) =>
            group.options.map((option) => option.productId),
        );

        expect(returnedProductIds).not.toContain(
          selectedOption.optionProductId,
        );
      } finally {
        await prisma.product.update({
          where: {
            id: selectedOption.optionProductId,
          },
          data: {
            isAvailable: originalAvailability,
          },
        });
      }
    });

    it('liefert Empfehlungen sortiert und filtert deaktivierte Empfehlungen', async () => {
      const category = await prisma.productCategory.findFirstOrThrow({
        orderBy: {
          id: 'asc',
        },
      });

      const testSuffix = `${Date.now()}-${crypto.randomUUID()}`;

      const mainProduct = await prisma.product.create({
        data: {
          categoryId: category.id,
          name: `E2E Hauptprodukt ${testSuffix}`,
          price: '10.00',
          isAvailable: true,
        },
      });

      const firstRecommendation = await prisma.product.create({
        data: {
          categoryId: category.id,
          name: `E2E Empfehlung 1 ${testSuffix}`,
          price: '2.50',
          isAvailable: true,
        },
      });

      const secondRecommendation = await prisma.product.create({
        data: {
          categoryId: category.id,
          name: `E2E Empfehlung 2 ${testSuffix}`,
          price: '3.75',
          isAvailable: true,
        },
      });

      const disabledRecommendation = await prisma.product.create({
        data: {
          categoryId: category.id,
          name: `E2E Empfehlung inaktiv ${testSuffix}`,
          price: '4.00',
          isAvailable: false,
        },
      });

      const createdProductIds = [
        mainProduct.id,
        firstRecommendation.id,
        secondRecommendation.id,
        disabledRecommendation.id,
      ];

      try {
        await prisma.productRecommendation.createMany({
          data: [
            {
              productId: mainProduct.id,
              recommendedProductId: firstRecommendation.id,
              sortOrder: 20,
            },
            {
              productId: mainProduct.id,
              recommendedProductId: secondRecommendation.id,
              sortOrder: 10,
            },
            {
              productId: mainProduct.id,
              recommendedProductId: disabledRecommendation.id,
              sortOrder: 5,
            },
          ],
        });

        const response = await request(app.getHttpServer())
          .get(`/api/v1/products/${mainProduct.id}`)
          .expect(200);

        expect(
          response.body.recommendations.map(
            (recommendation: { id: number }) => recommendation.id,
          ),
        ).toEqual([secondRecommendation.id, firstRecommendation.id]);

        expect(
          response.body.recommendations.map(
            (recommendation: { id: number }) => recommendation.id,
          ),
        ).not.toContain(disabledRecommendation.id);

        expect(response.body.recommendations[0]).toMatchObject({
          id: secondRecommendation.id,
          name: secondRecommendation.name,
          price: '3.75',
          category: {
            id: category.id,
            name: category.name,
          },
        });

        for (const recommendation of response.body.recommendations) {
          expect(recommendation.price).toMatch(/^\d+\.\d{2}$/);
        }
      } finally {
        await prisma.productRecommendation.deleteMany({
          where: {
            productId: mainProduct.id,
          },
        });

        await prisma.product.deleteMany({
          where: {
            id: {
              in: createdProductIds,
            },
          },
        });
      }
    });

    it('liefert für eine ungültige Produkt-ID 400', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products/abc')
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
      });
    });

    it('liefert für eine unbekannte Produkt-ID 404', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/products/2147483647')
        .expect(404);

      expect(response.body).toMatchObject({
        statusCode: 404,
        error: 'Not Found',
        message: 'Produkt wurde nicht gefunden.',
      });
    });

    it('liefert für ein deaktiviertes Produkt 404', async () => {
      const product = await prisma.product.findFirstOrThrow({
        where: {
          name: 'Halbes Hähnchen',
          isAvailable: true,
        },
      });

      const originalAvailability = product.isAvailable;

      try {
        await prisma.product.update({
          where: {
            id: product.id,
          },
          data: {
            isAvailable: false,
          },
        });

        const response = await request(app.getHttpServer())
          .get(`/api/v1/products/${product.id}`)
          .expect(404);

        expect(response.body).toMatchObject({
          statusCode: 404,
          error: 'Not Found',
          message: 'Produkt wurde nicht gefunden.',
        });
      } finally {
        await prisma.product.update({
          where: {
            id: product.id,
          },
          data: {
            isAvailable: originalAvailability,
          },
        });
      }
    });
  });

  it('/api/v1/carts/:cartId/items/:itemId (PATCH) ändert die Menge einer Position', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const itemId = addResponse.body.items[0].itemId;

    const increasedResponse = await request(app.getHttpServer())
      .patch(`/api/v1/carts/${cartResponse.body.cartId}/items/${itemId}`)
      .send({
        quantity: 3,
      })
      .expect(200);

    expect(increasedResponse.body.items).toHaveLength(1);
    expect(increasedResponse.body.items[0]).toMatchObject({
      itemId,
      quantity: 3,
    });

    const decreasedResponse = await request(app.getHttpServer())
      .patch(`/api/v1/carts/${cartResponse.body.cartId}/items/${itemId}`)
      .send({
        quantity: 1,
      })
      .expect(200);

    expect(decreasedResponse.body.items).toHaveLength(1);
    expect(decreasedResponse.body.items[0]).toMatchObject({
      itemId,
      quantity: 1,
    });
  });

  it('/api/v1/carts/:cartId/items/:itemId (PATCH) entfernt eine Position bei Menge 0', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const itemId = addResponse.body.items[0].itemId;

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/carts/${cartResponse.body.cartId}/items/${itemId}`)
      .send({
        quantity: 0,
      })
      .expect(200);

    expect(response.body.items).toEqual([]);
    expect(response.body.total).toBe('0.00');
  });
  it('/api/v1/carts/:cartId/items/:itemId (PATCH) lehnt ungültige Positions-IDs ab', async () => {
    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/carts/${cartResponse.body.cartId}/items/ungueltig`)
      .send({
        quantity: 1,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Die Warenkorbpositions-ID muss eine positive ganze Zahl sein.',
    });
  });

  it('/api/v1/carts/:cartId/items/:itemId (PATCH) lehnt Positionen aus einem anderen Warenkorb ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const firstCartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const secondCartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${firstCartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const itemId = addResponse.body.items[0].itemId;

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/carts/${secondCartResponse.body.cartId}/items/${itemId}`)
      .send({
        quantity: 2,
      })
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Warenkorbposition wurde nicht gefunden.',
    });
  });
  it('/api/v1/carts/:cartId/items/:itemId (PATCH) ändert die Optionsauswahl', async () => {
    const { product, optionIds, alternativeOptionIds } =
      await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 2,
        optionIds,
      })
      .expect(201);

    const itemId = addResponse.body.items[0].itemId;

    const response = await request(app.getHttpServer())
      .patch(`/api/v1/carts/${cartResponse.body.cartId}/items/${itemId}`)
      .send({
        quantity: 2,
        optionIds: alternativeOptionIds,
      })
      .expect(200);

    expect(response.body.items).toHaveLength(1);

    expect(response.body.items[0]).toMatchObject({
      itemId,
      quantity: 2,
      product: {
        id: product.id,
        name: product.name,
      },
    });

    const returnedOptionIds = response.body.items[0].options
      .map((option: { id: number }) => option.id)
      .sort((first: number, second: number) => first - second);

    expect(returnedOptionIds).toEqual(
      [...alternativeOptionIds].sort((first, second) => first - second),
    );
  });

  it('/api/v1/carts/:cartId/items (POST) erlaubt ein Produkt ohne optionale Optionen', async () => {
    const { product } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds: [],
      })
      .expect(201);

    expect(response.body.items).toHaveLength(1);

    expect(response.body.items[0]).toMatchObject({
      itemId: expect.any(Number),
      product: {
        id: product.id,
        name: product.name,
      },
      quantity: 1,
      baseUnitPrice: Number(product.price).toFixed(2),
      optionSurcharge: '0.00',
      unitTotal: Number(product.price).toFixed(2),
      options: [],
      lineTotal: Number(product.price).toFixed(2),
    });

    expect(response.body.total).toBe(Number(product.price).toFixed(2));
  });

  it('/api/v1/carts/:cartId/items/:itemId (DELETE) entfernt eine Position', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 2,
        optionIds,
      })
      .expect(201);

    const itemId = addResponse.body.items[0].itemId;

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/carts/${cartResponse.body.cartId}/items/${itemId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      cartId: cartResponse.body.cartId,
      status: 'offen',
      items: [],
      total: '0.00',
    });
  });

  it('/api/v1/carts/:cartId/items/:itemId (DELETE) lehnt ungültige Positions-IDs ab', async () => {
    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/carts/${cartResponse.body.cartId}/items/ungueltig`)
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Die Warenkorbpositions-ID muss eine positive ganze Zahl sein.',
    });
  });

  it('/api/v1/carts/:cartId/items/:itemId (DELETE) lehnt Positionen aus einem anderen Warenkorb ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const firstCartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const secondCartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${firstCartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const itemId = addResponse.body.items[0].itemId;

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/carts/${secondCartResponse.body.cartId}/items/${itemId}`)
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Warenkorbposition wurde nicht gefunden.',
    });
  });

  it('/api/v1/carts/:cartId/items/:itemId (DELETE) lehnt geschlossene Warenkörbe ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cart = await prisma.cart.create({
      data: {
        sessionId: crypto.randomUUID(),
        status: 'abgeschlossen',
      },
    });

    const item = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        quantity: 1,
        unitPrice: product.price,
        configurationKey: `product:${product.id}|options:${optionIds.join(',')}`,
      },
    });

    await request(app.getHttpServer())
      .delete(`/api/v1/carts/${cart.sessionId}/items/${item.id}`)
      .expect(409);
  });

  it('/api/v1/carts/:cartId/items/:itemId (DELETE) behandelt unbekannte Positionen', async () => {
    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/v1/carts/${cartResponse.body.cartId}/items/999999`)
      .expect(404);
  });

  it('/api/v1/carts/:cartId/items/:itemId (PATCH) verlangt mindestens ein Feld', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      });

    await request(app.getHttpServer())
      .patch(
        `/api/v1/carts/${cartResponse.body.cartId}/items/${addResponse.body.items[0].itemId}`,
      )
      .send({})
      .expect(400);
  });

  it('/api/v1/carts/:cartId/items/:itemId (PATCH) lehnt Mengen über 99 ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      });

    await request(app.getHttpServer())
      .patch(
        `/api/v1/carts/${cartResponse.body.cartId}/items/${addResponse.body.items[0].itemId}`,
      )
      .send({
        quantity: 100,
      })
      .expect(400);
  });

  it('/api/v1/carts/:cartId/items/:itemId (PATCH) lehnt unbekannte Optionen ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      });

    await request(app.getHttpServer())
      .patch(
        `/api/v1/carts/${cartResponse.body.cartId}/items/${addResponse.body.items[0].itemId}`,
      )
      .send({
        optionIds: [999999],
      })
      .expect(400);
  });

  it('/api/v1/carts/:cartId/items/:itemId (PATCH) lehnt doppelte Optionen ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      });

    await request(app.getHttpServer())
      .patch(
        `/api/v1/carts/${cartResponse.body.cartId}/items/${addResponse.body.items[0].itemId}`,
      )
      .send({
        optionIds: [optionIds[0], optionIds[0]],
      })
      .expect(400);
  });

  it('/api/v1/carts/:cartId/items/:itemId (PATCH) erlaubt zwei Beilagen derselben Gruppe', async () => {
    const { product } = await getConfiguredProduct();

    const sideGroup = await prisma.productOptionGroup.findFirstOrThrow({
      where: {
        mainProductId: product.id,
        optionType: 'SIDE',
      },
      include: {
        options: true,
      },
    });

    expect(sideGroup.maxSelections).toBe(2);

    const optionIds = sideGroup.options.slice(0, 2).map((option) => option.id);
    expect(optionIds).toHaveLength(2);

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
      });

    const response = await request(app.getHttpServer())
      .patch(
        `/api/v1/carts/${cartResponse.body.cartId}/items/${addResponse.body.items[0].itemId}`,
      )
      .send({
        optionIds,
      })
      .expect(200);

    expect(response.body.items[0].options).toHaveLength(2);
  });

  it('/api/v1/carts/:cartId/items (POST) trennt unterschiedliche Optionsauswahlen', async () => {
    const { product, optionIds, alternativeOptionIds } =
      await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const url = `/api/v1/carts/${cartResponse.body.cartId}/items`;

    await request(app.getHttpServer())
      .post(url)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(url)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds: alternativeOptionIds,
      })
      .expect(201);

    expect(response.body.items).toHaveLength(2);

    expect(response.body.items[0].product).toMatchObject({
      id: product.id,
      name: product.name,
    });

    expect(response.body.items[1].product).toMatchObject({
      id: product.id,
      name: product.name,
    });

    expect(response.body.items[0].quantity).toBe(1);
    expect(response.body.items[1].quantity).toBe(1);

    const returnedOptionSelections = response.body.items.map(
      (item: { options: Array<{ id: number }> }) =>
        item.options.map((option) => option.id).sort((a, b) => a - b),
    );

    expect(returnedOptionSelections).toEqual(
      expect.arrayContaining([
        [...optionIds].sort((a, b) => a - b),
        [...alternativeOptionIds].sort((a, b) => a - b),
      ]),
    );
  });

  it('/api/v1/carts (POST) erstellt einen leeren Warenkorb', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    expect(response.body).toMatchObject({
      status: 'offen',
      items: [],
      total: '0.00',
    });

    expect(response.body.cartId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    expect(Number.isNaN(Date.parse(response.body.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(response.body.updatedAt))).toBe(false);

    expect(response.body).not.toHaveProperty('id');
  });

  it('/api/v1/carts/:cartId/items (POST) fügt ein Produkt hinzu', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 2,
        optionIds,
      })
      .expect(201);

    const selectedOptions = await prisma.productOption.findMany({
      where: {
        id: {
          in: optionIds,
        },
      },
      include: {
        optionProduct: true,
      },
    });

    const expectedOptionSurcharge = selectedOptions.reduce(
      (sum, option) => sum + Number(option.surcharge),
      0,
    );

    const expectedUnitPrice = Number(product.price) + expectedOptionSurcharge;
    const expectedLineTotal = expectedUnitPrice * 2;

    expect(response.body).toMatchObject({
      cartId: cartResponse.body.cartId,
      status: 'offen',
      items: [
        {
          itemId: expect.any(Number),
          product: {
            id: product.id,
            name: product.name,
          },
          quantity: 2,
          baseUnitPrice: Number(product.price).toFixed(2),
          optionSurcharge: expectedOptionSurcharge.toFixed(2),
          unitTotal: expectedUnitPrice.toFixed(2),
          lineTotal: expectedLineTotal.toFixed(2),
        },
      ],
      total: expectedLineTotal.toFixed(2),
    });

    expect(response.body.items[0].options).toHaveLength(optionIds.length);

    expect(response.body.items[0].options).toEqual(
      expect.arrayContaining(
        selectedOptions.map((option) =>
          expect.objectContaining({
            id: option.id,
            name: option.optionProduct.name,
            surcharge: Number(option.surcharge).toFixed(2),
          }),
        ),
      ),
    );

    expect(response.body).not.toHaveProperty('id');
  });

  it('/api/v1/carts/:cartId/items (POST) erhöht vorhandene Menge', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const url = `/api/v1/carts/${cartResponse.body.cartId}/items`;

    await request(app.getHttpServer())
      .post(url)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(url)
      .send({
        productId: product.id,
        quantity: 2,
        optionIds,
      })
      .expect(201);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(3);
  });

  it('/api/v1/carts/:cartId/items (POST) lehnt ungültige Mengen ab', async () => {
    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({ productId: 1, quantity: 0 })
      .expect(400);
  });

  it('/api/v1/carts/:cartId/items (POST) behandelt unbekannte Warenkörbe', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/carts/unbekannt/items')
      .send({ productId: 1, quantity: 1 })
      .expect(404);
  });

  it('/api/v1/carts/:cartId/items (POST) lehnt unbekannte Produkte ab', async () => {
    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({ productId: 2147483647, quantity: 1 })
      .expect(404);
  });

  it('/api/v1/carts/:cartId/items behält den gespeicherten Grundpreis bei späterer Preisänderung', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const originalPrice = product.price;

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const itemId = addResponse.body.items[0].itemId;
    const originalUnitTotal = addResponse.body.items[0].unitTotal;

    try {
      await prisma.product.update({
        where: {
          id: product.id,
        },
        data: {
          price: originalPrice.plus(5),
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/carts/${cartResponse.body.cartId}/items/${itemId}`)
        .send({
          quantity: 2,
        })
        .expect(200);

      expect(response.body.items[0]).toMatchObject({
        itemId,
        quantity: 2,
        baseUnitPrice: originalPrice.toFixed(2),
        unitTotal: originalUnitTotal,
        lineTotal: (Number(originalUnitTotal) * 2).toFixed(2),
      });
    } finally {
      await prisma.product.update({
        where: {
          id: product.id,
        },
        data: {
          price: originalPrice,
        },
      });
    }
  });

  it('/api/v1/carts/:cartId/items behält gespeicherte Optionsaufpreise bei späterer Preisänderung', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const selectedOption = await prisma.productOption.findUniqueOrThrow({
      where: {
        id: optionIds[0],
      },
    });

    const originalSurcharge = selectedOption.surcharge;

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const itemId = addResponse.body.items[0].itemId;
    const originalOptionSurcharge = addResponse.body.items[0].optionSurcharge;
    const originalUnitTotal = addResponse.body.items[0].unitTotal;

    const storedOption = addResponse.body.items[0].options.find(
      (option: { id: number }) => option.id === selectedOption.id,
    );

    expect(storedOption).toBeDefined();

    try {
      await prisma.productOption.update({
        where: {
          id: selectedOption.id,
        },
        data: {
          surcharge: originalSurcharge.plus(5),
        },
      });

      const response = await request(app.getHttpServer())
        .patch(`/api/v1/carts/${cartResponse.body.cartId}/items/${itemId}`)
        .send({
          quantity: 2,
        })
        .expect(200);

      const returnedOption = response.body.items[0].options.find(
        (option: { id: number }) => option.id === selectedOption.id,
      );

      expect(returnedOption).toMatchObject({
        id: selectedOption.id,
        surcharge: originalSurcharge.toFixed(2),
      });

      expect(response.body.items[0]).toMatchObject({
        itemId,
        quantity: 2,
        optionSurcharge: originalOptionSurcharge,
        unitTotal: originalUnitTotal,
        lineTotal: (Number(originalUnitTotal) * 2).toFixed(2),
      });
    } finally {
      await prisma.productOption.update({
        where: {
          id: selectedOption.id,
        },
        data: {
          surcharge: originalSurcharge,
        },
      });
    }
  });

  it('/api/v1/carts lehnt Änderungen an einem geschlossenen Warenkorb ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const itemId = addResponse.body.items[0].itemId;

    await prisma.cart.update({
      where: {
        sessionId: cartResponse.body.cartId,
      },
      data: {
        status: 'abgeschlossen',
      },
    });

    const addAttempt = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(409);

    expect(addAttempt.body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
    });

    const patchAttempt = await request(app.getHttpServer())
      .patch(`/api/v1/carts/${cartResponse.body.cartId}/items/${itemId}`)
      .send({
        quantity: 2,
      })
      .expect(409);

    expect(patchAttempt.body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
    });

    const deleteAttempt = await request(app.getHttpServer())
      .delete(`/api/v1/carts/${cartResponse.body.cartId}/items/${itemId}`)
      .expect(409);

    expect(deleteAttempt.body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
    });
  });

  it('/api/v1/carts behandelt ein zwischenzeitlich deaktiviertes Produkt konsistent', async () => {
    const { product, optionIds, alternativeOptionIds } =
      await getConfiguredProduct();

    const existingCartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${existingCartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 2,
        optionIds,
      })
      .expect(201);

    const itemId = addResponse.body.items[0].itemId;

    try {
      await prisma.product.update({
        where: {
          id: product.id,
        },
        data: {
          isAvailable: false,
        },
      });

      const newCartResponse = await request(app.getHttpServer())
        .post('/api/v1/carts')
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/carts/${newCartResponse.body.cartId}/items`)
        .send({
          productId: product.id,
          quantity: 1,
          optionIds,
        })
        .expect(404);

      await request(app.getHttpServer())
        .patch(
          `/api/v1/carts/${existingCartResponse.body.cartId}/items/${itemId}`,
        )
        .send({
          quantity: 3,
        })
        .expect(409);

      const decreasedResponse = await request(app.getHttpServer())
        .patch(
          `/api/v1/carts/${existingCartResponse.body.cartId}/items/${itemId}`,
        )
        .send({
          quantity: 1,
        })
        .expect(200);

      expect(decreasedResponse.body.items[0]).toMatchObject({
        itemId,
        quantity: 1,
      });

      await request(app.getHttpServer())
        .patch(
          `/api/v1/carts/${existingCartResponse.body.cartId}/items/${itemId}`,
        )
        .send({
          optionIds: alternativeOptionIds,
        })
        .expect(409);

      const deleteResponse = await request(app.getHttpServer())
        .delete(
          `/api/v1/carts/${existingCartResponse.body.cartId}/items/${itemId}`,
        )
        .expect(200);

      expect(deleteResponse.body.items).toEqual([]);
      expect(deleteResponse.body.total).toBe('0.00');
    } finally {
      await prisma.product.update({
        where: {
          id: product.id,
        },
        data: {
          isAvailable: true,
        },
      });
    }
  });

  it('/api/v1/carts/:cartId/items (POST) lehnt unbekannte Felder ab', async () => {
    const { product } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        unbekanntesFeld: true,
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
    });

    expect(response.body.message).toEqual(
      expect.arrayContaining(['property unbekanntesFeld should not exist']),
    );
  });

  it('/api/v1/carts/:cartId/items (POST) lehnt ungültiges JSON ab', async () => {
    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .set('Content-Type', 'application/json')
      .send('{"productId": 1, "quantity":')
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
    });
  });

  it('/api/v1/carts/:cartId/items (POST) lehnt falsche Datentypen ab', async () => {
    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: 'kein-produkt',
        quantity: 'keine-menge',
        optionIds: ['keine-option'],
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
    });

    expect(Array.isArray(response.body.message)).toBe(true);
  });

  it('/api/v1/carts/:cartId (GET) ruft einen vorhandenen Warenkorb ab', async () => {
    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const response = await request(app.getHttpServer())
      .get(`/api/v1/carts/${cartResponse.body.cartId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      cartId: cartResponse.body.cartId,
      status: 'offen',
      items: [],
      total: '0.00',
    });

    expect(response.body).not.toHaveProperty('id');
  });

  it('/api/v1/carts/:cartId (GET) behandelt unbekannte Warenkörbe', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/carts/unbekannt')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Warenkorb wurde nicht gefunden.',
    });
  });

  it('/api/v1/carts/:cartId/items (DELETE) leert einen gefüllten Warenkorb', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 2,
        optionIds,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .expect(200);

    expect(response.body).toMatchObject({
      cartId: cartResponse.body.cartId,
      status: 'offen',
      items: [],
      total: '0.00',
    });

    const remainingItems = await prisma.cartItem.count({
      where: {
        cart: {
          sessionId: cartResponse.body.cartId,
        },
      },
    });

    expect(remainingItems).toBe(0);
  });

  it('/api/v1/carts/:cartId/items (DELETE) kann einen leeren Warenkorb erneut leeren', async () => {
    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const response = await request(app.getHttpServer())
      .delete(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .expect(200);

    expect(response.body).toMatchObject({
      cartId: cartResponse.body.cartId,
      status: 'offen',
      items: [],
      total: '0.00',
    });
  });

  it('/api/v1/carts/:cartId/items (DELETE) behandelt unbekannte Warenkörbe', async () => {
    const response = await request(app.getHttpServer())
      .delete('/api/v1/carts/unbekannt/items')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      code: 'CART_NOT_FOUND',
      error: 'Not Found',
      message: 'Warenkorb wurde nicht gefunden.',
    });
  });

  describe('finaler Warenkorbvertrag', () => {
    it('verwendet öffentlich cartId und EUR statt des internen Felds sessionId', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/carts')
        .expect(201);

      expect(response.body).toMatchObject({
        cartId: expect.any(String),
        currency: 'EUR',
      });
      expect(response.body).not.toHaveProperty('sessionId');
    });

    it('lehnt beim Hinzufügen jede Menge außerhalb von 1 bis 99 und eine fehlende Menge ab', async () => {
      const { product } = await getConfiguredProduct();
      const cartResponse = await request(app.getHttpServer())
        .post('/api/v1/carts')
        .expect(201);
      const url = `/api/v1/carts/${cartResponse.body.cartId}/items`;

      for (const quantity of [-1, 0, 1.5, 100]) {
        await request(app.getHttpServer())
          .post(url)
          .send({ productId: product.id, quantity })
          .expect(400);
      }

      await request(app.getHttpServer())
        .post(url)
        .send({ productId: product.id })
        .expect(400);
    });

    it('behandelt die Optionsreihenfolge als identische Konfiguration und begrenzt die zusammengeführte Menge auf 99', async () => {
      const { product, optionIds } = await getConfiguredProduct();
      const cartResponse = await request(app.getHttpServer())
        .post('/api/v1/carts')
        .expect(201);
      const url = `/api/v1/carts/${cartResponse.body.cartId}/items`;

      await request(app.getHttpServer())
        .post(url)
        .send({ productId: product.id, quantity: 98, optionIds })
        .expect(201);

      const mergedResponse = await request(app.getHttpServer())
        .post(url)
        .send({
          productId: product.id,
          quantity: 1,
          optionIds: [...optionIds].reverse(),
        })
        .expect(201);

      expect(mergedResponse.body.items).toHaveLength(1);
      expect(mergedResponse.body.items[0].quantity).toBe(99);

      const rejectedResponse = await request(app.getHttpServer())
        .post(url)
        .send({ productId: product.id, quantity: 1, optionIds })
        .expect(409);

      expect(rejectedResponse.body).toMatchObject({
        statusCode: 409,
        code: 'MAXIMUM_QUANTITY_EXCEEDED',
      });
    });

    it('führt zwei Positionen zusammen, wenn eine Optionsänderung dieselbe Konfiguration erzeugt', async () => {
      const { product, optionIds, alternativeOptionIds } =
        await getConfiguredProduct();
      const cartResponse = await request(app.getHttpServer())
        .post('/api/v1/carts')
        .expect(201);
      const url = `/api/v1/carts/${cartResponse.body.cartId}/items`;

      await request(app.getHttpServer())
        .post(url)
        .send({ productId: product.id, quantity: 2, optionIds })
        .expect(201);

      const secondPosition = await request(app.getHttpServer())
        .post(url)
        .send({
          productId: product.id,
          quantity: 3,
          optionIds: alternativeOptionIds,
        })
        .expect(201);

      const secondItem = secondPosition.body.items.find(
        (item: { options: Array<{ id: number }> }) =>
          item.options.some((option) => option.id === alternativeOptionIds[0]),
      );
      expect(secondItem).toBeDefined();

      const response = await request(app.getHttpServer())
        .patch(
          `/api/v1/carts/${cartResponse.body.cartId}/items/${secondItem.itemId}`,
        )
        .send({ optionIds })
        .expect(200);

      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].quantity).toBe(5);
    });

    it('prüft Pflichtauswahlen und setzt die temporäre Gruppenregel immer zurück', async () => {
      const { product } = await getConfiguredProduct();
      const optionGroup = product.optionGroups[0];
      expect(optionGroup).toBeDefined();
      const originalMinSelections = optionGroup.minSelections;

      try {
        await prisma.productOptionGroup.update({
          where: { id: optionGroup.id },
          data: { minSelections: 1 },
        });

        const cartResponse = await request(app.getHttpServer())
          .post('/api/v1/carts')
          .expect(201);
        const response = await request(app.getHttpServer())
          .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
          .send({ productId: product.id, quantity: 1, optionIds: [] })
          .expect(400);

        expect(response.body).toMatchObject({
          statusCode: 400,
          code: 'OPTION_SELECTION_INVALID',
        });
      } finally {
        await prisma.productOptionGroup.update({
          where: { id: optionGroup.id },
          data: { minSelections: originalMinSelections },
        });
      }
    });

    it('lehnt eine deaktivierte Produktoption ab und setzt deren Verfügbarkeit zurück', async () => {
      const { product, optionIds } = await getConfiguredProduct();
      const option = await prisma.productOption.findUniqueOrThrow({
        where: { id: optionIds[0] },
        include: { optionProduct: true },
      });
      const originalAvailability = option.optionProduct.isAvailable;

      try {
        await prisma.product.update({
          where: { id: option.optionProductId },
          data: { isAvailable: false },
        });

        const cartResponse = await request(app.getHttpServer())
          .post('/api/v1/carts')
          .expect(201);
        const response = await request(app.getHttpServer())
          .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
          .send({ productId: product.id, quantity: 1, optionIds: [option.id] })
          .expect(409);

        expect(response.body).toMatchObject({
          statusCode: 409,
          code: 'PRODUCT_OPTION_UNAVAILABLE',
        });
      } finally {
        await prisma.product.update({
          where: { id: option.optionProductId },
          data: { isAvailable: originalAvailability },
        });
      }
    });

    it('aktualisiert updatedAt nach einer erfolgreichen Mutation', async () => {
      const { product } = await getConfiguredProduct();
      const cartResponse = await request(app.getHttpServer())
        .post('/api/v1/carts')
        .expect(201);
      const oldUpdatedAt = new Date('2020-01-01T00:00:00.000Z');

      await prisma.cart.update({
        where: { sessionId: cartResponse.body.cartId },
        data: { updatedAt: oldUpdatedAt },
      });

      const response = await request(app.getHttpServer())
        .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
        .send({ productId: product.id, quantity: 1, optionIds: [] })
        .expect(201);

      expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
        oldUpdatedAt.getTime(),
      );
    });
  });

  it('/api/v1/orders bereitet einen gefüllten Warenkorb vor', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    orderCartId = cartResponse.body.cartId;

    expect(orderCartId).toEqual(expect.any(String));

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${orderCartId}/items`)
      .send({
        productId: product.id,
        quantity: 2,
        optionIds,
      })
      .expect(201);

    expect(addResponse.body.items).toHaveLength(1);
    expect(addResponse.body.items[0]).toMatchObject({
      product: {
        id: product.id,
        name: product.name,
      },
      quantity: 2,
    });
  });

  it('/api/v1/orders (POST) erstellt eine Abholbestellung', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        cartId: orderCartId,
        paymentMethodId,
        requestedTime: getValidRequestedTime(),
        customer: {
          firstName: 'Max',
          lastName: 'Mustermann',
          phone: '+49 170 1234567',
        },
        note: 'Bitte gut durchgrillen.',
      })
      .expect(201);

    orderNumber = response.body.orderNumber;

    expect(orderNumber).toMatch(/^IDIL-\d{8}-[0-9A-F]{8}$/);

    expect(response.body).toMatchObject({
      orderNumber,
      orderType: 'ABHOLUNG',
      status: 'Eingegangen',
      customer: {
        firstName: 'Max',
        lastName: 'Mustermann',
        phone: '+49 170 1234567',
      },
      note: 'Bitte gut durchgrillen.',
      deliveryFee: '0.00',
      discountAmount: '0.00',
    });

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(2);
    expect(response.body.subtotal).toMatch(/^\d+\.\d{2}$/);
    expect(response.body.totalAmount).toBe(response.body.subtotal);
    expect(Number.isNaN(Date.parse(response.body.orderedAt))).toBe(false);
    expect(Number.isNaN(Date.parse(response.body.requestedTime))).toBe(false);

    const storedCart = await prisma.cart.findUniqueOrThrow({
      where: {
        sessionId: orderCartId,
      },
    });

    expect(storedCart.status).toBe('bestellt');
  });

  it('/api/v1/orders/:orderNumber (GET) ruft die Bestellbestätigung ab', async () => {
    const response = await request(app.getHttpServer())
      .get(`/api/v1/orders/${orderNumber}`)
      .expect(200);

    expect(response.body).toMatchObject({
      orderNumber,
      orderType: 'ABHOLUNG',
      status: 'Eingegangen',
      customer: {
        firstName: 'Max',
        lastName: 'Mustermann',
        phone: '+49 170 1234567',
      },
      note: 'Bitte gut durchgrillen.',
      deliveryFee: '0.00',
      discountAmount: '0.00',
    });

    expect(response.body.items).toHaveLength(1);
    expect(response.body.totalAmount).toBe(response.body.subtotal);
  });

  it('/api/v1/orders (POST) verhindert eine doppelte Bestellung', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        cartId: orderCartId,
        paymentMethodId,
        requestedTime: getValidRequestedTime(),
        customer: {
          firstName: 'Max',
          lastName: 'Mustermann',
          phone: '+49 170 1234567',
        },
      })
      .expect(409);

    expect(response.body).toMatchObject({
      statusCode: 409,
      error: 'Conflict',
    });
  });

  it('/api/v1/orders (POST) lehnt einen leeren Warenkorb ab', async () => {
    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        cartId: cartResponse.body.cartId,
        paymentMethodId,
        requestedTime: getValidRequestedTime(),
        customer: {
          firstName: 'Erika',
          lastName: 'Musterfrau',
          phone: '+49 170 7654321',
        },
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message:
        'Aus einem leeren Warenkorb kann keine Bestellung erstellt werden.',
    });
  });

  it('/api/v1/orders (POST) lehnt unbekannte Warenkörbe ab', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        cartId: crypto.randomUUID(),
        paymentMethodId,
        requestedTime: getValidRequestedTime(),
        customer: {
          firstName: 'Erika',
          lastName: 'Musterfrau',
          phone: '+49 170 7654321',
        },
      })
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Warenkorb wurde nicht gefunden.',
    });
  });

  it('/api/v1/orders (POST) lehnt ungültige Kundendaten ab', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        cartId: crypto.randomUUID(),
        paymentMethodId,
        customer: {
          firstName: '',
          lastName: '',
          phone: 'abc',
        },
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
    });

    expect(Array.isArray(response.body.message)).toBe(true);
  });

  it('/api/v1/orders (POST) lehnt Lieferdaten im Abhol-MVP ab', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        cartId: crypto.randomUUID(),
        paymentMethodId,
        customer: {
          firstName: 'Erika',
          lastName: 'Musterfrau',
          phone: '+49 170 7654321',
        },
        deliveryAddress: {
          street: 'Musterstraße',
          houseNumber: '1',
          postalCode: '12345',
          city: 'Musterstadt',
        },
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
    });

    expect(response.body.message).toEqual(
      expect.arrayContaining(['property deliveryAddress should not exist']),
    );
  });

  it('/api/v1/orders (POST) lehnt einen vergangenen Abholzeitpunkt ab', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        cartId: crypto.randomUUID(),
        paymentMethodId,
        customer: {
          firstName: 'Erika',
          lastName: 'Musterfrau',
          phone: '+49 170 7654321',
        },
        requestedTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message:
        'Der gewünschte Abholzeitpunkt darf nicht in der Vergangenheit liegen.',
    });
  });

  it('/api/v1/orders (POST) lehnt einen zu weit entfernten Abholzeitpunkt ab', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        cartId: crypto.randomUUID(),
        paymentMethodId,
        customer: {
          firstName: 'Erika',
          lastName: 'Musterfrau',
          phone: '+49 170 7654321',
        },
        requestedTime: new Date(
          Date.now() + 15 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message:
        'Der gewünschte Abholzeitpunkt darf höchstens 14 Tage in der Zukunft liegen.',
    });
  });

  it('/api/v1/orders/:orderNumber (GET) behandelt unbekannte Bestellungen', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/orders/IDIL-20990101-UNBEKANNT')
      .expect(404);

    expect(response.body).toMatchObject({
      statusCode: 404,
      error: 'Not Found',
      message: 'Bestellung wurde nicht gefunden.',
    });
  });

  it('/api/v1/orders (POST) lehnt ein zwischenzeitlich deaktiviertes Produkt ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    await prisma.product.update({
      where: {
        id: product.id,
      },
      data: {
        isAvailable: false,
      },
    });

    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          cartId: cartResponse.body.cartId,
          paymentMethodId,
          requestedTime: getValidRequestedTime(),
          customer: {
            firstName: 'Erika',
            lastName: 'Musterfrau',
            phone: '+49 170 7654321',
          },
        })
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
        message: `Das Produkt „${product.name}“ ist nicht mehr verfügbar. Bitte aktualisiere deinen Warenkorb.`,
      });

      const storedCart = await prisma.cart.findUniqueOrThrow({
        where: {
          sessionId: cartResponse.body.cartId,
        },
      });

      expect(storedCart.status).toBe('offen');
    } finally {
      await prisma.product.update({
        where: {
          id: product.id,
        },
        data: {
          isAvailable: true,
        },
      });
    }
  });

  it('/api/v1/orders (POST) lehnt eine zwischenzeitlich deaktivierte Option ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const selectedOption = await prisma.productOption.findUniqueOrThrow({
      where: {
        id: optionIds[0],
      },
      include: {
        optionProduct: true,
      },
    });

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    await prisma.product.update({
      where: {
        id: selectedOption.optionProductId,
      },
      data: {
        isAvailable: false,
      },
    });

    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          cartId: cartResponse.body.cartId,
          paymentMethodId,
          requestedTime: getValidRequestedTime(),
          customer: {
            firstName: 'Erika',
            lastName: 'Musterfrau',
            phone: '+49 170 7654321',
          },
        })
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
        message: `Die Option „${selectedOption.optionProduct.name}“ ist nicht mehr verfügbar. Bitte aktualisiere deinen Warenkorb.`,
      });
    } finally {
      await prisma.product.update({
        where: {
          id: selectedOption.optionProductId,
        },
        data: {
          isAvailable: true,
        },
      });
    }
  });

  it('/api/v1/orders (POST) lehnt eine nicht mehr zum Produkt gehörende Option ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const otherProduct = await prisma.product.findFirstOrThrow({
      where: {
        id: {
          not: product.id,
        },
        isAvailable: true,
      },
    });

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const cartItemId = addResponse.body.items[0].itemId;

    await prisma.cartItem.update({
      where: {
        id: cartItemId,
      },
      data: {
        productId: otherProduct.id,
      },
    });

    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          cartId: cartResponse.body.cartId,
          paymentMethodId,
          requestedTime: getValidRequestedTime(),
          customer: {
            firstName: 'Erika',
            lastName: 'Musterfrau',
            phone: '+49 170 7654321',
          },
        })
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });

      expect(response.body.message).toContain(
        `gehört nicht mehr zum Produkt „${otherProduct.name}“`,
      );
    } finally {
      await prisma.cartItem.update({
        where: {
          id: cartItemId,
        },
        data: {
          productId: product.id,
        },
      });
    }
  });

  it('/api/v1/orders (POST) lehnt eine unterschrittene Mindestauswahl ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const selectedOption = await prisma.productOption.findUniqueOrThrow({
      where: {
        id: optionIds[0],
      },
      include: {
        optionGroup: true,
      },
    });

    const group = selectedOption.optionGroup;

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    await prisma.productOptionGroup.update({
      where: {
        id: group.id,
      },
      data: {
        minSelections: 2,
        maxSelections: Math.max(group.maxSelections, 2),
      },
    });

    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          cartId: cartResponse.body.cartId,
          paymentMethodId,
          requestedTime: getValidRequestedTime(),
          customer: {
            firstName: 'Erika',
            lastName: 'Musterfrau',
            phone: '+49 170 7654321',
          },
        })
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });

      expect(response.body.message).toContain(
        `Für die Optionsgruppe „${group.name}“`,
      );

      expect(response.body.message).toContain(
        'müssen mindestens 2 Optionen ausgewählt werden',
      );
    } finally {
      await prisma.productOptionGroup.update({
        where: {
          id: group.id,
        },
        data: {
          minSelections: group.minSelections,
          maxSelections: group.maxSelections,
        },
      });
    }
  });

  it('/api/v1/orders (POST) lehnt eine überschrittene Maximalauswahl ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const selectedOption = await prisma.productOption.findUniqueOrThrow({
      where: {
        id: optionIds[0],
      },
      include: {
        optionGroup: true,
      },
    });

    const group = selectedOption.optionGroup;

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    await prisma.productOptionGroup.update({
      where: {
        id: group.id,
      },
      data: {
        minSelections: 0,
        maxSelections: 0,
      },
    });

    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          cartId: cartResponse.body.cartId,
          paymentMethodId,
          requestedTime: getValidRequestedTime(),
          customer: {
            firstName: 'Erika',
            lastName: 'Musterfrau',
            phone: '+49 170 7654321',
          },
        })
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
      });

      expect(response.body.message).toContain(
        `Für die Optionsgruppe „${group.name}“`,
      );

      expect(response.body.message).toContain(
        'dürfen höchstens 0 Optionen ausgewählt werden',
      );
    } finally {
      await prisma.productOptionGroup.update({
        where: {
          id: group.id,
        },
        data: {
          minSelections: group.minSelections,
          maxSelections: group.maxSelections,
        },
      });
    }
  });

  it('/api/v1/orders (POST) lehnt eine ungültig gespeicherte Menge ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const addResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const cartItemId = addResponse.body.items[0].itemId;

    await prisma.cartItem.update({
      where: {
        id: cartItemId,
      },
      data: {
        quantity: 21,
      },
    });

    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          cartId: cartResponse.body.cartId,
          paymentMethodId,
          requestedTime: getValidRequestedTime(),
          customer: {
            firstName: 'Erika',
            lastName: 'Musterfrau',
            phone: '+49 170 7654321',
          },
        })
        .expect(409);

      expect(response.body).toMatchObject({
        statusCode: 409,
        error: 'Conflict',
        message: `Die Menge des Produkts „${product.name}“ muss zwischen 1 und 20 liegen. Bitte aktualisiere deinen Warenkorb.`,
      });
    } finally {
      await prisma.cartItem.update({
        where: {
          id: cartItemId,
        },
        data: {
          quantity: 1,
        },
      });
    }
  });

  it('/api/v1/orders (POST) verlangt mindestens 30 Minuten Vorbereitungszeit', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const requestedTime = new Date(Date.now() + 10 * 60 * 1000);

    const berlinParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Berlin',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(requestedTime);

    const weekday = berlinParts
      .find((part) => part.type === 'weekday')!
      .value.toUpperCase();

    const storedOpeningHours = await prisma.openingHour.findMany({
      where: {
        weekday,
      },
    });

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    await prisma.openingHour.updateMany({
      where: {
        weekday,
      },
      data: {
        opensAt: new Date(Date.UTC(1970, 0, 1, 0, 0)),
        closesAt: new Date(Date.UTC(1970, 0, 1, 23, 59)),
      },
    });

    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          cartId: cartResponse.body.cartId,
          paymentMethodId,
          customer: {
            firstName: 'Erika',
            lastName: 'Musterfrau',
            phone: '+49 170 7654321',
          },
          requestedTime: requestedTime.toISOString(),
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Der gewünschte Abholzeitpunkt muss mindestens 30 Minuten in der Zukunft liegen.',
      });
    } finally {
      for (const openingHour of storedOpeningHours) {
        await prisma.openingHour.update({
          where: {
            id: openingHour.id,
          },
          data: {
            opensAt: openingHour.opensAt,
            closesAt: openingHour.closesAt,
          },
        });
      }
    }
  });

  it('/api/v1/orders (POST) lehnt einen geschlossenen Abholtag ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const requestedTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Berlin',
      weekday: 'long',
    })
      .format(requestedTime)
      .toUpperCase();

    const storedOpeningHours = await prisma.openingHour.findMany({
      where: {
        weekday,
      },
    });

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    await prisma.openingHour.deleteMany({
      where: {
        weekday,
      },
    });

    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          cartId: cartResponse.body.cartId,
          paymentMethodId,
          customer: {
            firstName: 'Erika',
            lastName: 'Musterfrau',
            phone: '+49 170 7654321',
          },
          requestedTime: requestedTime.toISOString(),
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Das Restaurant ist am gewünschten Abholtag geschlossen.',
      });
    } finally {
      await prisma.openingHour.createMany({
        data: storedOpeningHours.map((openingHour) => ({
          restaurantId: openingHour.restaurantId,
          weekday: openingHour.weekday,
          opensAt: openingHour.opensAt,
          closesAt: openingHour.closesAt,
        })),
      });
    }
  });

  it('/api/v1/orders (POST) lehnt eine Abholung außerhalb der Öffnungszeiten ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const requestedTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const weekday = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Berlin',
      weekday: 'long',
    })
      .format(requestedTime)
      .toUpperCase();

    const storedOpeningHours = await prisma.openingHour.findMany({
      where: {
        weekday,
      },
    });

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    await prisma.openingHour.updateMany({
      where: {
        weekday,
      },
      data: {
        opensAt: new Date('1970-01-01T00:00:00.000Z'),
        closesAt: new Date('1970-01-01T00:01:00.000Z'),
      },
    });

    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          cartId: cartResponse.body.cartId,
          paymentMethodId,
          customer: {
            firstName: 'Erika',
            lastName: 'Musterfrau',
            phone: '+49 170 7654321',
          },
          requestedTime: requestedTime.toISOString(),
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Der gewünschte Abholzeitpunkt liegt außerhalb der Öffnungszeiten.',
      });
    } finally {
      for (const openingHour of storedOpeningHours) {
        await prisma.openingHour.update({
          where: {
            id: openingHour.id,
          },
          data: {
            opensAt: openingHour.opensAt,
            closesAt: openingHour.closesAt,
          },
        });
      }
    }
  });

  it('/api/v1/orders (POST) lehnt eine Abholung kurz vor Ladenschluss ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const requestedTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);

    const berlinParts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Europe/Berlin',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(requestedTime);

    const weekday = berlinParts
      .find((part) => part.type === 'weekday')!
      .value.toUpperCase();

    const requestedHour = Number(
      berlinParts.find((part) => part.type === 'hour')!.value,
    );

    const requestedMinute = Number(
      berlinParts.find((part) => part.type === 'minute')!.value,
    );

    const requestedMinutes = requestedHour * 60 + requestedMinute;
    const openingMinutes = Math.max(0, requestedMinutes - 60);
    const closingMinutes = Math.min(1439, requestedMinutes + 20);

    const storedOpeningHours = await prisma.openingHour.findMany({
      where: {
        weekday,
      },
    });

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    await prisma.openingHour.updateMany({
      where: {
        weekday,
      },
      data: {
        opensAt: new Date(
          Date.UTC(
            1970,
            0,
            1,
            Math.floor(openingMinutes / 60),
            openingMinutes % 60,
          ),
        ),
        closesAt: new Date(
          Date.UTC(
            1970,
            0,
            1,
            Math.floor(closingMinutes / 60),
            closingMinutes % 60,
          ),
        ),
      },
    });

    try {
      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          cartId: cartResponse.body.cartId,
          paymentMethodId,
          customer: {
            firstName: 'Erika',
            lastName: 'Musterfrau',
            phone: '+49 170 7654321',
          },
          requestedTime: requestedTime.toISOString(),
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message:
          'Der gewünschte Abholzeitpunkt muss mindestens 30 Minuten vor Ladenschluss liegen.',
      });
    } finally {
      for (const openingHour of storedOpeningHours) {
        await prisma.openingHour.update({
          where: {
            id: openingHour.id,
          },
          data: {
            opensAt: openingHour.opensAt,
            closesAt: openingHour.closesAt,
          },
        });
      }
    }
  });

  it('/api/v1/orders (POST) verhindert zwei parallele Bestellungen', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const orderData = {
      cartId: cartResponse.body.cartId,
      paymentMethodId,
      requestedTime: getValidRequestedTime(),
      customer: {
        firstName: 'Erika',
        lastName: 'Musterfrau',
        phone: '+49 170 7654321',
      },
    };

    const responses = await Promise.all([
      request(app.getHttpServer()).post('/api/v1/orders').send(orderData),
      request(app.getHttpServer()).post('/api/v1/orders').send(orderData),
    ]);

    const statusCodes = responses
      .map((response) => response.status)
      .sort((first, second) => first - second);

    expect(statusCodes).toEqual([201, 409]);

    const storedCart = await prisma.cart.findUniqueOrThrow({
      where: {
        sessionId: cartResponse.body.cartId,
      },
    });

    const storedOrders = await prisma.order.count({
      where: {
        cartId: storedCart.id,
      },
    });

    expect(storedOrders).toBe(1);
  });

  it('/api/v1/orders (POST) verlangt eine Zahlungsart', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        cartId: crypto.randomUUID(),
        customer: {
          firstName: 'Erika',
          lastName: 'Musterfrau',
          phone: '+49 170 7654321',
        },
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
    });
  });

  it('/api/v1/orders (POST) lehnt eine unbekannte Zahlungsart ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        cartId: cartResponse.body.cartId,
        paymentMethodId: 2147483647,
        requestedTime: getValidRequestedTime(),
        customer: {
          firstName: 'Erika',
          lastName: 'Musterfrau',
          phone: '+49 170 7654321',
        },
      })
      .expect(400);

    expect(response.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Die ausgewählte Zahlungsart ist nicht verfügbar.',
    });
  });

  it('/api/v1/orders (POST) lehnt eine deaktivierte Zahlungsart ab', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const inactivePaymentMethod = await prisma.paymentMethod.create({
      data: {
        name: `E2E inaktiv ${Date.now()}`,
        isOnlinePayment: false,
        isActive: false,
      },
    });

    try {
      const cartResponse = await request(app.getHttpServer())
        .post('/api/v1/carts')
        .expect(201);

      await request(app.getHttpServer())
        .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
        .send({
          productId: product.id,
          quantity: 1,
          optionIds,
        })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post('/api/v1/orders')
        .send({
          cartId: cartResponse.body.cartId,
          paymentMethodId: inactivePaymentMethod.id,
          requestedTime: getValidRequestedTime(),
          customer: {
            firstName: 'Erika',
            lastName: 'Musterfrau',
            phone: '+49 170 7654321',
          },
        })
        .expect(400);

      expect(response.body).toMatchObject({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Die ausgewählte Zahlungsart ist nicht verfügbar.',
      });
    } finally {
      await prisma.paymentMethod.delete({
        where: {
          id: inactivePaymentMethod.id,
        },
      });
    }
  });

  it('/api/v1/orders (POST) speichert und liefert die Zahlung', async () => {
    const { product, optionIds } = await getConfiguredProduct();

    const paymentMethod = await prisma.paymentMethod.findUniqueOrThrow({
      where: {
        id: paymentMethodId,
      },
    });

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const cartWithItemResponse = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.cartId}/items`)
      .send({
        productId: product.id,
        quantity: 1,
        optionIds,
      })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/orders')
      .send({
        cartId: cartResponse.body.cartId,
        paymentMethodId,
        requestedTime: getValidRequestedTime(),
        customer: {
          firstName: 'Erika',
          lastName: 'Musterfrau',
          phone: '+49 170 7654321',
        },
      })
      .expect(201);

    expect(response.body.payments).toHaveLength(1);

    expect(response.body.payments[0]).toMatchObject({
      id: expect.any(Number),
      method: {
        id: paymentMethod.id,
        name: paymentMethod.name,
        isOnlinePayment: paymentMethod.isOnlinePayment,
      },
      amount: cartWithItemResponse.body.total,
      status: 'AUSSTEHEND',
      createdAt: expect.any(String),
      paidAt: null,
    });

    const storedOrder = await prisma.order.findUniqueOrThrow({
      where: {
        orderNumber: response.body.orderNumber,
      },
      include: {
        payments: true,
      },
    });

    expect(storedOrder.payments).toHaveLength(1);

    expect(storedOrder.payments[0]).toMatchObject({
      paymentMethodId,
      paymentStatus: 'AUSSTEHEND',
      paidAt: null,
    });

    expect(storedOrder.payments[0].amount.toFixed(2)).toBe(
      cartWithItemResponse.body.total,
    );
  });

  afterAll(async () => {
    await app.close();
    await prisma.$disconnect();
  });
});
