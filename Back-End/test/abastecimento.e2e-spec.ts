import { INestApplication } from '@nestjs/common';
import { TipoCombustivel } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearDatabase, createTruck, registerAndLogin } from './e2e.utils';

describe('Fluxo de abastecimento (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await app.close();
  });

  it('deve registrar abastecimentos validos, calcular media e bloquear quilometragem regressiva', async () => {
    const { token } = await registerAndLogin(app, '100005');
    await createTruck(app, token).expect(201);

    await request(app.getHttpServer())
      .post('/abastecimentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        precoPorLitro: 6,
        totalLitros: 100,
        quilometragem: 1000,
        tipoCombustivel: TipoCombustivel.DIESEL_S10,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/abastecimentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        precoPorLitro: 6,
        totalLitros: 50,
        quilometragem: 1400,
        tipoCombustivel: TipoCombustivel.DIESEL_S10,
      })
      .expect(201);

    const mediaResponse = await request(app.getHttpServer())
      .get('/abastecimentos/media-consumo')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(mediaResponse.body.mediaConsumo).toBe(8);

    await request(app.getHttpServer())
      .post('/abastecimentos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        precoPorLitro: 6,
        totalLitros: 40,
        quilometragem: 1300,
        tipoCombustivel: TipoCombustivel.DIESEL_S10,
      })
      .expect(400);

    const listResponse = await request(app.getHttpServer())
      .get('/abastecimentos')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(listResponse.body).toHaveLength(2);
  });
});
