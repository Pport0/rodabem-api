import { INestApplication } from '@nestjs/common';
import { TipoCarga, TipoCombustivel } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { OrsService } from '../src/frete/ors.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearDatabase, createTruck, registerAndLogin } from './e2e.utils';

describe('Fluxo de frete (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(OrsService)
      .useValue({
        calcularRota: jest.fn().mockResolvedValue({
          distanciaKm: 300,
          duracaoMinutos: 240,
          descricaoRota: 'Goiania -> Brasilia',
        }),
      })
      .compile();

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

  it('deve simular frete com historico e bloquear simulacao sem caminhao', async () => {
    const withTruck = await registerAndLogin(app, '100006');
    const withoutTruck = await registerAndLogin(app, '100007');

    await createTruck(app, withTruck.token, { numeroEixos: 6 }).expect(201);

    await prisma.tabelaAntt.create({
      data: {
        numeroEixos: 6,
        tipoCarga: TipoCarga.GERAL,
        distanciaMin: 0,
        distanciaMax: 1000,
        valorPorKm: 5,
        atualizadoEm: new Date(),
      },
    });

    await request(app.getHttpServer())
      .post('/abastecimentos')
      .set('Authorization', `Bearer ${withTruck.token}`)
      .send({
        precoPorLitro: 6,
        totalLitros: 100,
        quilometragem: 1000,
        tipoCombustivel: TipoCombustivel.DIESEL_S10,
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/abastecimentos')
      .set('Authorization', `Bearer ${withTruck.token}`)
      .send({
        precoPorLitro: 6,
        totalLitros: 50,
        quilometragem: 1400,
        tipoCombustivel: TipoCombustivel.DIESEL_S10,
      })
      .expect(201);

    const simularResponse = await request(app.getHttpServer())
      .post('/frete/simular')
      .set('Authorization', `Bearer ${withTruck.token}`)
      .send({
        origem: 'Goiania, GO',
        destino: 'Brasilia, DF',
        tipoCarga: TipoCarga.GERAL,
        precoCombustivel: 6,
        pedagiosManual: 50,
      })
      .expect(201);

    expect(simularResponse.body.simulacaoId).toBeDefined();
    expect(simularResponse.body.distanciaKm).toBe(300);

    await request(app.getHttpServer())
      .post('/frete/simular')
      .set('Authorization', `Bearer ${withoutTruck.token}`)
      .send({
        origem: 'Goiania, GO',
        destino: 'Brasilia, DF',
        tipoCarga: TipoCarga.GERAL,
        precoCombustivel: 6,
      })
      .expect(400);
  });
});
