import { INestApplication, ValidationPipe } from '@nestjs/common';
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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        stopAtFirstError: true,
      }),
    );
    await app.init();
    await app.listen(0);

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await prisma.$disconnect();
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

  describe('POST /caminhao - numero de eixos previsto pela ANTT', () => {
    const EIXOS_DA_ANTT = [2, 3, 4, 5, 6, 7, 9];
    const FORA_DA_TABELA = [1, 8, 10];

    it.each(FORA_DA_TABELA)(
      'deve recusar o cadastro de caminhao com %i eixos, que a ANTT nao preve',
      async (numeroEixos) => {
        const { token } = await registerAndLogin(app, `30${numeroEixos}`);

        await createTruck(app, token, { numeroEixos }).expect(400);
      },
    );

    it.each(EIXOS_DA_ANTT)(
      'deve aceitar o cadastro de caminhao com %i eixos, que a ANTT preve',
      async (numeroEixos) => {
        const { token } = await registerAndLogin(app, `31${numeroEixos}`);

        await createTruck(app, token, { numeroEixos }).expect(201);
      },
    );
  });

  describe('POST /frete/simular - faixa da tabela', () => {
    const semearTabela = async () => {
      for (const [numeroEixos, valorPorKm] of [[4, 3], [6, 5], [8, 7]]) {
        await prisma.tabelaAntt.create({
          data: {
            numeroEixos,
            tipoCarga: TipoCarga.GERAL,
            distanciaMin: 0,
            distanciaMax: 1000,
            valorPorKm,
            atualizadoEm: new Date(),
          },
        });
      }
    };

    it('deve usar a faixa exata quando ela existe', async () => {
      await semearTabela();

      const { token } = await registerAndLogin(app, '100010');
      await createTruck(app, token, { numeroEixos: 6 }).expect(201);

      const resposta = await request(app.getHttpServer())
        .post('/frete/simular')
        .set('Authorization', `Bearer ${token}`)
        .send({
          origem: 'Goiania, GO',
          destino: 'Brasilia, DF',
          tipoCarga: TipoCarga.GERAL,
          precoCombustivel: 6,
          consumoMedioKmLOverride: 10,
        });

      expect(resposta.status).toBe(201);
      expect(resposta.body.valorMinimoAntt).toBeGreaterThan(0);
    });
  });

  describe('POST /frete/simular - percentual de lucro desejado (RF-14)', () => {
    const semearTabela = async () => {
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
    };

    const simularComLucro = async (sufixo: string, percentualLucroDesejado: number) => {
      await semearTabela();

      const { token } = await registerAndLogin(app, sufixo);
      await createTruck(app, token, { numeroEixos: 6 }).expect(201);

      return request(app.getHttpServer())
        .post('/frete/simular')
        .set('Authorization', `Bearer ${token}`)
        .send({
          origem: 'Goiania, GO',
          destino: 'Brasilia, DF',
          tipoCarga: TipoCarga.GERAL,
          precoCombustivel: 6,
          consumoMedioKmLOverride: 10,
          percentualLucroDesejado,
        });
    };

    it('deve devolver um valor sugerido a partir do percentual de lucro informado', async () => {
      const resposta = await simularComLucro('400001', 20);

      expect(resposta.status).toBe(201);
      expect(resposta.body.valorSugerido).toBeGreaterThan(0);
    });

    it('deve sugerir valor maior quando o lucro desejado e maior', async () => {
      const vinte = await simularComLucro('400002', 20);
      await clearDatabase(prisma);
      const quarenta = await simularComLucro('400003', 40);

      expect(quarenta.body.valorSugerido).toBeGreaterThan(vinte.body.valorSugerido);
    });

    it('nao deve sugerir valor abaixo do piso minimo da ANTT', async () => {
      const resposta = await simularComLucro('400004', 0);

      expect(resposta.body.valorSugerido).toBeGreaterThanOrEqual(
        resposta.body.valorMinimoAntt,
      );
    });

    it('deve aceitar lucro zero, cobrindo os custos sem margem', async () => {
      const resposta = await simularComLucro('400005', 0);

      expect(resposta.status).toBe(201);
      expect(resposta.body.valorSugerido).toBeGreaterThan(0);
    });

    it('deve recusar percentual de lucro negativo', async () => {
      const resposta = await simularComLucro('400006', -10);

      expect(resposta.status).toBe(400);
    });
  });

});
