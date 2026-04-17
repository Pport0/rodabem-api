import { INestApplication } from '@nestjs/common';
import { TipoCombustivel } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearDatabase, createTruck, registerAndLogin } from './e2e.utils';

describe('Isolamento entre usuarios (e2e)', () => {
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

  it('deve negar acesso de um usuario aos dados do outro', async () => {
    const userA = await registerAndLogin(app, '100008');
    const userB = await registerAndLogin(app, '100009');

    await createTruck(app, userA.token).expect(201);

    const abastecimento = await request(app.getHttpServer())
      .post('/abastecimentos')
      .set('Authorization', `Bearer ${userA.token}`)
      .send({
        precoPorLitro: 6,
        totalLitros: 100,
        quilometragem: 1000,
        tipoCombustivel: TipoCombustivel.DIESEL_S10,
      })
      .expect(201);

    const abastecimentoId = abastecimento.body.id;

    await request(app.getHttpServer())
      .get(`/abastecimentos/${abastecimentoId}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .expect(403);

    await request(app.getHttpServer())
      .patch(`/abastecimentos/${abastecimentoId}`)
      .set('Authorization', `Bearer ${userB.token}`)
      .send({ observacao: 'Tentativa indevida' })
      .expect(403);
  });
});
