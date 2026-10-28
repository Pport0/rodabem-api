import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TipoCarga, TipoCombustivel } from '@prisma/client';
import { Test, TestingModule } from '@nestjs/testing';
import { getStorageToken } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { OrsService } from '../src/frete/ors.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearDatabase, createTruck, registerAndLogin,
  semLimiteDeRequisicoes,
} from './e2e.utils';

describe('Fluxo de frete (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getStorageToken())
      .useValue(semLimiteDeRequisicoes)
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
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: true,
      }),
    );
    await app.init();
    await app.listen(0);

    prisma = app.get(PrismaService);
  });

  const versaoVigente = async () => {
    const existente = await prisma.versaoAntt.findFirst({
      where: { resolucao: 'Res. de teste' },
    });

    if (existente) return existente.id;

    const criada = await prisma.versaoAntt.create({
      data: {
        resolucao: 'Res. de teste',
        vigenteDesde: new Date(Date.now() - 1000),
        vigenteAte: null,
      },
    });

    return criada.id;
  };

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
        versaoId: await versaoVigente(),
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

  describe('POST /caminhao - numero de eixos aceito no cadastro', () => {
    const EIXOS_DA_TABELA = [2, 3, 4, 5, 6, 7, 9];
    const EIXOS_FORA_DA_TABELA = [8, 10];
    const EIXOS_IMPOSSIVEIS = [0, 1, 100];

    it.each(EIXOS_DA_TABELA)(
      'deve aceitar caminhao com %i eixos, que a tabela da ANTT publica',
      async (numeroEixos) => {
        const { token } = await registerAndLogin(app, `31${numeroEixos}`);

        await createTruck(app, token, { numeroEixos }).expect(201);
      },
    );

    it.each(EIXOS_FORA_DA_TABELA)(
      'deve aceitar caminhao com %i eixos, que existe embora a tabela nao publique',
      async (numeroEixos) => {
        const { token } = await registerAndLogin(app, `30${numeroEixos}`);

        await createTruck(app, token, { numeroEixos }).expect(201);
      },
    );

    it.each(EIXOS_IMPOSSIVEIS)(
      'deve recusar caminhao com %i eixos, que nenhum veiculo tem',
      async (numeroEixos) => {
        const { token } = await registerAndLogin(app, `32${numeroEixos}`);

        await createTruck(app, token, { numeroEixos }).expect(400);
      },
    );
  });

  describe('POST /frete/simular - faixa da tabela', () => {
    const CC = 100;

    const semearFaixas = async () => {
      const versaoId = await versaoVigente();

      for (const [distanciaMin, distanciaMax, valorPorKm] of [
        [0, 500, 3],
        [501, 2000, 7],
      ]) {
        await prisma.tabelaAntt.create({
          data: {
            numeroEixos: 6,
            tipoCarga: TipoCarga.GERAL,
            distanciaMin,
            distanciaMax,
            valorPorKm,
            cc: CC,
            versaoId,
          },
        });
      }
    };

    const simular = async (corpo: Record<string, unknown>) => {
      const { token } = await registerAndLogin(app, '100010');
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
          ...corpo,
        });
    };

    it('deve usar a faixa da distancia carregada, nao a da viagem dobrada', async () => {
      await semearFaixas();

      const resposta = await simular({ retornoVazio: true });

      expect(resposta.status).toBe(201);
      expect(resposta.body.distanciaKm).toBe(600);
      expect(resposta.body.valorMinimoAntt).toBe(300 * 3 + CC + 300 * 3 * 0.92);
    });

    it('deve usar a faixa seguinte quando a ida sozinha ja a alcanca', async () => {
      await semearFaixas();

      const resposta = await simular({});

      expect(resposta.status).toBe(201);
      expect(resposta.body.valorMinimoAntt).toBe(300 * 3 + CC);
    });
  });

  describe('POST /frete/simular - eixos que a tabela nao publica', () => {
    const CC = 100;

    const publicarApenas = async (eixos: number[]) => {
      const versaoId = await versaoVigente();

      for (const numeroEixos of eixos) {
        await prisma.tabelaAntt.create({
          data: {
            numeroEixos,
            tipoCarga: TipoCarga.GERAL,
            distanciaMin: 0,
            distanciaMax: 99999,
            valorPorKm: numeroEixos,
            cc: CC,
            versaoId,
          },
        });
      }
    };

    const simularComEixos = async (numeroEixos: number, sufixo: string) => {
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

    it('deve usar o numero de eixos imediatamente inferior quando o informado nao esta na tabela', async () => {
      await publicarApenas([5, 9]);

      const resposta = await simularComEixos(7, '410001');

      expect(resposta.status).toBe(201);
      expect(resposta.body.valorMinimoAntt).toBe(300 * 5 + CC);
    });

    it('deve usar o imediatamente superior quando nao existe inferior', async () => {
      await publicarApenas([5, 9]);

      const resposta = await simularComEixos(2, '410002');

      expect(resposta.status).toBe(201);
      expect(resposta.body.valorMinimoAntt).toBe(300 * 5 + CC);
    });

    it('nao deve recusar a simulacao por falta de linha exata na tabela', async () => {
      await publicarApenas([5, 9]);

      const resposta = await simularComEixos(4, '410003');

      expect(resposta.status).not.toBe(404);
    });

    it('deve aceitar caminhao de 8 eixos e simular pelo vizinho', async () => {
      await publicarApenas([7, 9]);

      const { token } = await registerAndLogin(app, '410004');
      await createTruck(app, token, { numeroEixos: 8 }).expect(201);

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
      expect(resposta.body.valorMinimoAntt).toBe(300 * 7 + CC);
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
          versaoId: await versaoVigente(),
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

    it('deve avisar quando o valor sugerido fica abaixo do piso da ANTT', async () => {
      const resposta = await simularComLucro('400004', 0);

      expect(resposta.body.valorSugerido).toBeLessThan(
        resposta.body.valorMinimoAntt,
      );
      expect(resposta.body.sugeridoAbaixoDoMinimo).toBe(true);
      expect(resposta.body.aviso).toMatch(/piso m[ií]nimo da ANTT/i);
    });

    it('nao deve avisar quando o valor sugerido cobre o piso da ANTT', async () => {
      const resposta = await simularComLucro('400006', 2000);

      expect(resposta.body.valorSugerido).toBeGreaterThanOrEqual(
        resposta.body.valorMinimoAntt,
      );
      expect(resposta.body.sugeridoAbaixoDoMinimo).toBe(false);
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
