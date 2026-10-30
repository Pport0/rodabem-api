import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getStorageToken } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  VERSAO_TERMO,
  buildUserPayload,
  clearDatabase,
  registerAndLogin,
  semLimiteDeRequisicoes,
} from './e2e.utils';

describe('Termo de uso e aceite (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getStorageToken())
      .useValue(semLimiteDeRequisicoes)
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

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  const VERSAO_NOVA = '2.0';

  const publicarVersaoNova = async () => {
    await prisma.termoUso.updateMany({ data: { ativo: false } });
    return prisma.termoUso.create({
      data: {
        versao: VERSAO_NOVA,
        conteudo: 'Segunda versao do termo, publicada para a bancada.',
        ativo: true,
      },
    });
  };

  const aceitesDe = async (email: string) => {
    const usuario = await prisma.user.findUnique({ where: { email } });
    return prisma.aceiteTermo.findMany({
      where: { userId: usuario!.id },
      include: { termo: { select: { versao: true } } },
      orderBy: { id: 'asc' },
    });
  };

  const cadastrar = (payload: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/users')
      .set('User-Agent', 'bancada-de-testes')
      .send(payload);

  describe('GET /termos/vigente', () => {
    it('deve entregar o termo vigente sem exigir autenticacao', async () => {
      const resposta = await request(app.getHttpServer())
        .get('/termos/vigente')
        .expect(200);

      expect(resposta.body.versao).toBe(VERSAO_TERMO);
      expect(resposta.body.conteudo).toBeTruthy();
      expect(resposta.body.publicadoEm).toBeTruthy();
    });

    it('deve responder 404 quando nenhum termo foi publicado', async () => {
      await clearDatabase(prisma, { comTermoVigente: false });

      await request(app.getHttpServer()).get('/termos/vigente').expect(404);
    });
  });

  describe('aceite no cadastro', () => {
    it('deve registrar o aceite da versao vigente junto com o usuario', async () => {
      const payload = buildUserPayload('700001');

      await cadastrar(payload).expect(201);

      const aceites = await aceitesDe(payload.email);

      expect(aceites).toHaveLength(1);
      expect(aceites[0].termo.versao).toBe(VERSAO_TERMO);
      expect(aceites[0].aceitoEm).toBeTruthy();
      expect(aceites[0].ip).toBeTruthy();
      expect(aceites[0].userAgent).toBeTruthy();
    });

    it('deve recusar cadastro sem a versao do termo', async () => {
      const { termoVersao: _, ...semTermo } = buildUserPayload('700002');

      await cadastrar(semTermo).expect(400);

      const usuario = await prisma.user.findFirst({
        where: { email: semTermo.email },
      });
      expect(usuario).toBeNull();
    });

    it('deve recusar cadastro com versao que nao e a vigente', async () => {
      const payload = buildUserPayload('700003');

      await cadastrar({ ...payload, termoVersao: '0.9' }).expect(400);

      const usuario = await prisma.user.findFirst({
        where: { email: payload.email },
      });
      expect(usuario).toBeNull();
    });
  });

  describe('bloqueio enquanto o aceite esta pendente', () => {
    it('deve recusar rota de negocio com 403 e codigo proprio', async () => {
      const { token } = await registerAndLogin(app, '700010');
      await publicarVersaoNova();

      const resposta = await request(app.getHttpServer())
        .get('/caminhao')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      expect(resposta.body.code).toBe('TERMO_PENDENTE');
    });

    it('deve informar a pendencia no proprio perfil', async () => {
      const { token } = await registerAndLogin(app, '700011');

      const antes = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await publicarVersaoNova();

      const depois = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(antes.body.termoPendente).toBe(false);
      expect(depois.body.termoPendente).toBe(true);
    });

    it('deve permitir encerrar a sessao com o aceite pendente', async () => {
      const { token } = await registerAndLogin(app, '700012');
      await publicarVersaoNova();

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
    });

    it('deve permitir excluir a propria conta com o aceite pendente', async () => {
      const { user, token } = await registerAndLogin(app, '700013');
      await publicarVersaoNova();

      const perfil = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .delete(`/users/${perfil.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(
        await prisma.user.findFirst({ where: { email: user.email } }),
      ).toBeNull();
    });
  });

  describe('POST /termos/aceite', () => {
    it('deve liberar as rotas de negocio depois do aceite', async () => {
      const { token } = await registerAndLogin(app, '700020');
      await publicarVersaoNova();

      await request(app.getHttpServer())
        .get('/caminhao')
        .set('Authorization', `Bearer ${token}`)
        .expect(403);

      await request(app.getHttpServer())
        .post('/termos/aceite')
        .set('Authorization', `Bearer ${token}`)
        .send({ termoVersao: VERSAO_NOVA })
        .expect(201);

      await request(app.getHttpServer())
        .get('/caminhao')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('deve recusar aceite de versao que nao e a vigente', async () => {
      const { token } = await registerAndLogin(app, '700021');
      await publicarVersaoNova();

      await request(app.getHttpServer())
        .post('/termos/aceite')
        .set('Authorization', `Bearer ${token}`)
        .send({ termoVersao: VERSAO_TERMO })
        .expect(400);
    });

    it('nao deve duplicar o aceite nem mover a data quando repetido', async () => {
      const { user, token } = await registerAndLogin(app, '700022');
      await publicarVersaoNova();

      await request(app.getHttpServer())
        .post('/termos/aceite')
        .set('Authorization', `Bearer ${token}`)
        .send({ termoVersao: VERSAO_NOVA })
        .expect(201);

      const primeiro = (await aceitesDe(user.email)).find(
        (a) => a.termo.versao === VERSAO_NOVA,
      )!;

      await request(app.getHttpServer())
        .post('/termos/aceite')
        .set('Authorization', `Bearer ${token}`)
        .send({ termoVersao: VERSAO_NOVA })
        .expect(201);

      const aceites = await aceitesDe(user.email);
      const daVersaoNova = aceites.filter((a) => a.termo.versao === VERSAO_NOVA);

      expect(daVersaoNova).toHaveLength(1);
      expect(daVersaoNova[0].aceitoEm).toEqual(primeiro.aceitoEm);
    });
  });

  describe('publicacao de versao nova', () => {
    it('deve preservar o aceite da versao anterior ao publicar outra', async () => {
      const { user, token } = await registerAndLogin(app, '700030');
      await publicarVersaoNova();

      await request(app.getHttpServer())
        .post('/termos/aceite')
        .set('Authorization', `Bearer ${token}`)
        .send({ termoVersao: VERSAO_NOVA })
        .expect(201);

      const versoesAceitas = (await aceitesDe(user.email)).map(
        (a) => a.termo.versao,
      );

      expect(versoesAceitas).toEqual([VERSAO_TERMO, VERSAO_NOVA]);
    });
  });
});
