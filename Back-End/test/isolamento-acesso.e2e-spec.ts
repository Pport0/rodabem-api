import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TipoCarga, TipoCombustivel } from '@prisma/client';
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

  const simulacaoDe = async (sufixo: string) => {
    const dono = await registerAndLogin(app, sufixo);
    await createTruck(app, dono.token, { numeroEixos: 6 }).expect(201);

    const usuario = await prisma.user.findUnique({ where: { email: dono.user.email } });
    const caminhao = await prisma.caminhao.findUnique({ where: { userId: usuario.id } });

    const simulacao = await prisma.simulacaoFrete.create({
      data: {
        origem: 'Goiania, GO',
        destino: 'Belem, PA',
        distanciaKm: 1250.5,
        pedagiosEstimados: 180.4,
        consumoMedioKmL: 12,
        precoCombustivel: 6.29,
        litrosNecessarios: 104.21,
        custoCombustivel: 655.48,
        tipoCarga: TipoCarga.GERAL,
        valorMinimoAntt: 6471.46,
        valorLiquidoEstimado: 5635.58,
        user: { connect: { id: usuario.id } },
        caminhao: { connect: { id: caminhao.id } },
      },
    });

    return { dono, simulacao };
  };

  it('deve negar acesso de um usuario ao historico de frete do outro', async () => {
    const { dono, simulacao } = await simulacaoDe('100016');
    const intruso = await registerAndLogin(app, '100017');

    await request(app.getHttpServer())
      .get(`/frete/historico/${simulacao.id}`)
      .set('Authorization', `Bearer ${dono.token}`)
      .expect(200);

    await request(app.getHttpServer())
      .get(`/frete/historico/${simulacao.id}`)
      .set('Authorization', `Bearer ${intruso.token}`)
      .expect(403);
  });

  it('nao deve listar no historico de frete a simulacao de outro usuario', async () => {
    await simulacaoDe('100018');
    const intruso = await registerAndLogin(app, '100019');

    const resposta = await request(app.getHttpServer())
      .get('/frete/historico')
      .set('Authorization', `Bearer ${intruso.token}`)
      .expect(200);

    expect(resposta.body).toEqual([]);
  });
});
