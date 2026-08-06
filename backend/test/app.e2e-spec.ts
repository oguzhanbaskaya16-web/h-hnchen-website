import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

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
          price: 7.5,
          isHighlight: true,
        });

        expect(typeof chickenCategory.products[0].price).toBe('number');

        expect(chickenCategory.products[0]).not.toHaveProperty('categoryId');
        expect(chickenCategory.products[0]).not.toHaveProperty('isAvailable');
      });
  });

  it('/api/v1/carts (POST) erstellt einen leeren Warenkorb', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    expect(response.body).toMatchObject({
      status: 'offen',
      items: [],
      total: 0,
    });

    expect(response.body.sessionId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );

    expect(Number.isNaN(Date.parse(response.body.createdAt))).toBe(false);
    expect(Number.isNaN(Date.parse(response.body.updatedAt))).toBe(false);

    expect(response.body).not.toHaveProperty('id');
  });

  it('/api/v1/carts/:cartId/items (POST) fügt ein Produkt hinzu', async () => {
    const menuResponse = await request(app.getHttpServer())
      .get('/api/v1/menu')
      .expect(200);
    const product = menuResponse.body.categories[0].products[0];

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.sessionId}/items`)
      .send({ productId: product.id, quantity: 2 })
      .expect(201);

    expect(response.body).toMatchObject({
      sessionId: cartResponse.body.sessionId,
      status: 'offen',
      items: [
        {
          productId: product.id,
          name: product.name,
          quantity: 2,
          unitPrice: product.price,
          lineTotal: product.price * 2,
        },
      ],
      total: product.price * 2,
    });

    expect(response.body).not.toHaveProperty('id');
  });

  it('/api/v1/carts/:cartId/items (POST) erhöht vorhandene Menge', async () => {
    const menuResponse = await request(app.getHttpServer())
      .get('/api/v1/menu')
      .expect(200);
    const product = menuResponse.body.categories[0].products[0];

    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    const url = `/api/v1/carts/${cartResponse.body.sessionId}/items`;

    await request(app.getHttpServer())
      .post(url)
      .send({ productId: product.id, quantity: 1 })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post(url)
      .send({ productId: product.id, quantity: 2 })
      .expect(201);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].quantity).toBe(3);
  });

  it('/api/v1/carts/:cartId/items (POST) lehnt ungültige Mengen ab', async () => {
    const cartResponse = await request(app.getHttpServer())
      .post('/api/v1/carts')
      .expect(201);

    await request(app.getHttpServer())
      .post(`/api/v1/carts/${cartResponse.body.sessionId}/items`)
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
      .post(`/api/v1/carts/${cartResponse.body.sessionId}/items`)
      .send({ productId: 2147483647, quantity: 1 })
      .expect(404);
  });

  afterAll(async () => {
    await app.close();
  });
});
