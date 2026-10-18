import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildUserPayload, clearDatabase, registerAndLogin } from './e2e.utils';

describe('Dados sensiveis em repouso (e2e)', () => {
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

  it('nunca deve gravar a senha em texto puro', async () => {
    const payload = buildUserPayload('400001');

    await request(app.getHttpServer())
      .post('/users')
      .send(payload)
      .expect(201);

    const gravado = await prisma.user.findFirst({
      where: { email: payload.email },
    });

    expect(gravado).not.toBeNull();
    expect(gravado!.senhaHash).not.toBe(payload.senha);
    expect(gravado!.senhaHash).not.toContain(payload.senha);
  });

  it('nunca deve gravar o cpf em texto puro', async () => {
    const payload = buildUserPayload('400002');

    await request(app.getHttpServer())
      .post('/users')
      .send(payload)
      .expect(201);

    const gravado = await prisma.user.findFirst({
      where: { email: payload.email },
    });

    expect(gravado!.cpfEncrypted).not.toBe(payload.cpf);
    expect(gravado!.cpfEncrypted).not.toContain(payload.cpf);
    expect(gravado!.cpfHash).not.toBe(payload.cpf);
    expect(gravado!.cpfHash).not.toContain(payload.cpf);
  });

  it('deve devolver o cpf original ao proprio dono, provando que a cifragem e reversivel', async () => {
    const { user, token } = await registerAndLogin(app, '400003');

    const perfil = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(perfil.body.cpf).toBe(user.cpf);
  });

  it('nao deve gravar o mesmo texto cifrado para cpfs diferentes', async () => {
    const primeiro = buildUserPayload('400004');
    const segundo = buildUserPayload('400005');

    await request(app.getHttpServer()).post('/users').send(primeiro).expect(201);
    await request(app.getHttpServer()).post('/users').send(segundo).expect(201);

    const gravados = await prisma.user.findMany({
      where: { email: { in: [primeiro.email, segundo.email] } },
    });

    expect(gravados[0].cpfEncrypted).not.toBe(gravados[1].cpfEncrypted);
    expect(gravados[0].cpfHash).not.toBe(gravados[1].cpfHash);
  });

  it('nunca deve expor senha nem cpf cifrado na resposta do cadastro', async () => {
    const payload = buildUserPayload('400006');

    const resposta = await request(app.getHttpServer())
      .post('/users')
      .send(payload)
      .expect(201);

    const corpo = JSON.stringify(resposta.body);
    expect(corpo).not.toContain(payload.senha);
    expect(corpo).not.toContain(payload.cpf);
    expect(resposta.body.senhaHash).toBeUndefined();
    expect(resposta.body.cpfEncrypted).toBeUndefined();
    expect(resposta.body.cpfHash).toBeUndefined();
  });
  it('deve recusar login de usuario inativo', async () => {
    const payload = buildUserPayload('400007');

    await request(app.getHttpServer()).post('/users').send(payload).expect(201);

    await prisma.user.update({
      where: { email: payload.email },
      data: { status: false },
    });

    const resposta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ telefone: payload.telefone, senha: payload.senha });

    expect(resposta.status).toBe(401);
    expect(resposta.body.access_token).toBeUndefined();
  });

  it('deve permitir login depois que o usuario volta a ficar ativo', async () => {
    const payload = buildUserPayload('400008');

    await request(app.getHttpServer()).post('/users').send(payload).expect(201);
    await prisma.user.update({
      where: { email: payload.email },
      data: { status: false },
    });
    await prisma.user.update({
      where: { email: payload.email },
      data: { status: true },
    });

    const resposta = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ telefone: payload.telefone, senha: payload.senha });

    expect(resposta.status).toBe(201);
    expect(resposta.body.access_token).toBeDefined();
  });
});
