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
    // Mesmo ValidationPipe do `src/main.ts`.
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        stopAtFirstError: true,
      }),
    );
    await app.init();
    // Poe o servidor para escutar uma vez so. Sem isso o supertest abre e fecha uma porta a cada requisicao.
    await app.listen(0);

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    // `PrismaService` so implementa OnModuleInit, entao `app.close()` nao desconecta o cliente.
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

  /**
   * Nota 1 da Resolucao ANTT 5.867/2020: quando o numero de eixos nao consta na tabela, aplica-se a quantidade
   * imediatamente inferior; na falta de inferior, a imediatamente superior.
   *
   * Os testes comparam qual linha da tabela foi usada, em vez de fixar o valor do piso, para continuarem validos
   * quando a formula for corrigida.
   */
  describe('POST /frete/simular - numero de eixos fora da tabela', () => {
    /** Semeia a tabela com faixas para 4, 6 e 8 eixos, com valores distintos. */
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

    /** Simula um frete para um caminhao com o numero de eixos informado. */
    const pisoCom = async (sufixo: string, numeroEixos: number) => {
      const { token } = await registerAndLogin(app, sufixo);
      await createTruck(app, token, { numeroEixos }).expect(201);

      return request(app.getHttpServer())
        .post('/frete/simular')
        .set('Authorization', `Bearer ${token}`)
        .send({
          origem: 'Goiania, GO',
          destino: 'Brasilia, DF',
          tipoCarga: TipoCarga.GERAL,
          precoCombustivel: 6,
          consumoMedioKmLOverride: 10,
        });
    };

    it('deve usar a faixa exata quando ela existe', async () => {
      await semearTabela();

      const resposta = await pisoCom('100010', 6);

      expect(resposta.status).toBe(201);
      expect(resposta.body.valorMinimoAntt).toBeGreaterThan(0);
    });

    it('deve usar o numero de eixos imediatamente inferior quando nao ha faixa exata', async () => {
      await semearTabela();

      const seteEixos = await pisoCom('100011', 7);
      const seisEixos = await pisoCom('100012', 6);

      expect(seteEixos.status).toBe(201);
      expect(seteEixos.body.valorMinimoAntt).toBe(seisEixos.body.valorMinimoAntt);
    });

    it('deve usar o numero de eixos imediatamente superior quando nao ha inferior', async () => {
      await semearTabela();

      const doisEixos = await pisoCom('100013', 2);
      const quatroEixos = await pisoCom('100014', 4);

      expect(doisEixos.status).toBe(201);
      expect(doisEixos.body.valorMinimoAntt).toBe(quatroEixos.body.valorMinimoAntt);
    });

    it('nao deve recusar a simulacao por falta de faixa exata de eixos', async () => {
      await semearTabela();

      const resposta = await pisoCom('100015', 7);

      expect(resposta.status).not.toBe(404);
    });
  });

});
