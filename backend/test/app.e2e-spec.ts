import { INestApplication } from '@nestjs/common';
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

    app.setGlobalPrefix('api/v1');

    app.enableShutdownHooks();

    await app.init();
  });

  it('/api/v1/health (GET) prüft Anwendung und Datenbank', async () => {
    await request(app.getHttpServer()).get('/api/v1/health').expect(200).expect({
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
        description:
          'Frisch gegrillte Hähnchenspezialitäten zur Abholung.',
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

  afterAll(async () => {
    await app.close();
  });
});
