import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearDatabase, createTruck, registerAndLogin } from './e2e.utils';

describe('Caminhao (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const meuCaminhao = (token: string) =>
    request(app.getHttpServer())
      .get('/caminhao')
      .set('Authorization', `Bearer ${token}`);

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

  describe('cadastro', () => {
    it('deve cadastrar o caminhao do usuario autenticado', async () => {
      const dono = await registerAndLogin(app, '300001');

      const resposta = await createTruck(app, dono.token, {
        placa: 'XYZ9A88',
        modelo: 'Actros 2651',
        renavam: '98765432109',
        numeroEixos: 6,
      });

      expect(resposta.status).toBe(201);

      const consulta = await meuCaminhao(dono.token);
      expect(consulta.body).toMatchObject({
        placa: 'XYZ9A88',
        modelo: 'Actros 2651',
      });
    });

    it('deve recusar cadastro sem os campos obrigatorios', async () => {
      const dono = await registerAndLogin(app, '300002');

      const resposta = await request(app.getHttpServer())
        .post('/caminhao')
        .set('Authorization', `Bearer ${dono.token}`)
        .send({ modelo: 'Sem placa nem renavam' });

      expect(resposta.status).toBe(400);
    });

    it('deve recusar um segundo caminhao para o mesmo usuario', async () => {
      const dono = await registerAndLogin(app, '300003');
      await createTruck(app, dono.token);

      const segundo = await createTruck(app, dono.token, {
        placa: 'QQQ1B11',
        renavam: '11122233344',
      });

      expect(segundo.status).toBe(400);
    });

    it('deve exigir autenticacao', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/caminhao')
        .send({ placa: 'ABC1D23', modelo: 'FH', renavam: '123' });

      expect(resposta.status).toBe(401);
    });
  });

  describe('consulta', () => {
    it('nao deve devolver o caminhao de outro usuario', async () => {
      const dono = await registerAndLogin(app, '300004');
      const outro = await registerAndLogin(app, '300005');
      await createTruck(app, dono.token, { placa: 'DON1O11' });

      const consulta = await meuCaminhao(outro.token);

      expect(consulta.body?.placa).toBeUndefined();
    });
  });

  describe('edicao', () => {
    it('deve alterar apenas o caminhao do proprio usuario', async () => {
      const dono = await registerAndLogin(app, '300006');
      const outro = await registerAndLogin(app, '300007');
      await createTruck(app, dono.token, { placa: 'DON2O22' });
      await createTruck(app, outro.token, { placa: 'OUT2R22' });

      await request(app.getHttpServer())
        .put('/caminhao')
        .set('Authorization', `Bearer ${dono.token}`)
        .send({ modelo: 'Modelo alterado' });

      await expect(
        meuCaminhao(dono.token).then((r) => r.body.modelo),
      ).resolves.toBe('Modelo alterado');
      await expect(
        meuCaminhao(outro.token).then((r) => r.body.modelo),
      ).resolves.toBe('FH 540');
    });
  });

  describe('exclusao', () => {
    it('deve excluir o caminhao sem vinculos', async () => {
      const dono = await registerAndLogin(app, '300008');
      await createTruck(app, dono.token);

      const resposta = await request(app.getHttpServer())
        .delete('/caminhao')
        .set('Authorization', `Bearer ${dono.token}`);

      expect(resposta.status).toBe(200);
      await expect(
        meuCaminhao(dono.token).then((r) => r.body?.placa),
      ).resolves.toBeUndefined();
    });

    it('deve recusar exclusao de caminhao com abastecimento vinculado', async () => {
      const dono = await registerAndLogin(app, '300009');
      await createTruck(app, dono.token);

      const abastecimento = await request(app.getHttpServer())
        .post('/abastecimentos')
        .set('Authorization', `Bearer ${dono.token}`)
        .send({
          totalLitros: 100,
          precoPorLitro: 6,
          tipoCombustivel: 'DIESEL_S10',
          quilometragem: 1000,
        });

      expect(abastecimento.status).toBe(201);

      const resposta = await request(app.getHttpServer())
        .delete('/caminhao')
        .set('Authorization', `Bearer ${dono.token}`);

      expect(resposta.status).toBe(400);
      await expect(
        meuCaminhao(dono.token).then((r) => r.body?.placa),
      ).resolves.toBe('ABC1D23');
    });
  });
});
