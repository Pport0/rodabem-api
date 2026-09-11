import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildUserPayload, clearDatabase, registerAndLogin } from './e2e.utils';

describe('Fluxo de autenticacao (e2e)', () => {
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

  it('deve criar usuario, fazer login, acessar rota protegida, negar sem token e invalidar token apos logout', async () => {
    const { token } = await registerAndLogin(app, '100001');

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    await request(app.getHttpServer()).get('/users').expect(401);

    await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    await request(app.getHttpServer())
      .get('/users')
      .set('Authorization', `Bearer ${token}`)
      .expect(401);
  });

  describe('login - credenciais invalidas', () => {
    it('deve recusar login com senha incorreta', async () => {
      const { user } = await registerAndLogin(app, '100002');

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: 'senha-errada' })
        .expect(401);
    });

    it('deve recusar login de usuario inexistente', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: '62000000000', senha: '123456' })
        .expect(401);
    });

    it('deve recusar login sem cpf e sem telefone', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ senha: '123456' })
        .expect(401);
    });

    it('nao deve devolver token no corpo quando o login falha', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: '62000000000', senha: '123456' });

      expect(resposta.body.access_token).toBeUndefined();
    });
  });

  describe('login - credenciais validas', () => {
    it('deve autenticar por telefone e devolver token e dados do usuario', async () => {
      const user = buildUserPayload('100003');
      await request(app.getHttpServer()).post('/users').send(user).expect(201);

      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(201);

      expect(typeof resposta.body.access_token).toBe('string');
      expect(resposta.body.user).toMatchObject({
        nome: user.nome,
        email: user.email,
      });
    });

    it('deve autenticar por cpf, exercitando a busca por valor criptografado', async () => {
      const user = buildUserPayload('100004');
      await request(app.getHttpServer()).post('/users').send(user).expect(201);

      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ cpf: user.cpf, senha: user.senha })
        .expect(201);

      expect(typeof resposta.body.access_token).toBe('string');
    });

    it('nunca deve expor senha nem cpf na resposta do login', async () => {
      const user = buildUserPayload('100005');
      await request(app.getHttpServer()).post('/users').send(user).expect(201);

      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(201);

      const corpo = JSON.stringify(resposta.body);
      expect(corpo).not.toContain(user.senha);
      expect(corpo).not.toContain(user.cpf);
      expect(resposta.body.user).not.toHaveProperty('senhaHash');
      expect(resposta.body.user).not.toHaveProperty('cpfEncrypted');
    });
  });

  describe('protecao de rotas', () => {
    it('deve recusar acesso com token malformado', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', 'Bearer token-invalido')
        .expect(401);
    });

    it('deve recusar acesso quando o header nao usa o prefixo Bearer', async () => {
      const { token } = await registerAndLogin(app, '100006');

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', token)
        .expect(401);
    });

    it('deve recusar acesso com header authorization vazio', async () => {
      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', '')
        .expect(401);
    });
  });

  describe('logout', () => {
    it('deve exigir autenticacao para efetuar logout', async () => {
      await request(app.getHttpServer()).post('/auth/logout').expect(401);
    });

    it('deve recusar o mesmo token em um segundo logout', async () => {
      const { token } = await registerAndLogin(app, '100007');

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });

    it('nao deve invalidar o token de outra sessao ao fazer logout', async () => {
      const primeira = await registerAndLogin(app, '100008');
      const segunda = await registerAndLogin(app, '100009');

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${primeira.token}`)
        .expect(201);

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${segunda.token}`)
        .expect(200);
    });
  });

  describe('validacao de entrada (caracterizacao)', () => {
    it('aceita senha abaixo do minimo declarado no DTO, pois nao ha ValidationPipe', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: '62000000000', senha: '1' });

      expect(resposta.status).toBe(401);
      expect(resposta.status).not.toBe(400);
    });
  });


  describe('validade do token', () => {
    it('deve recusar token expirado', async () => {
      const jwt = app.get(JwtService);
      const expirado = jwt.sign(
        { sub: 1, email: 'expirado@example.com' },
        { expiresIn: '-1s' },
      );

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${expirado}`)
        .expect(401);
    });

    it('deve recusar token assinado com outro segredo', async () => {
      const jwt = app.get(JwtService);
      const forjado = jwt.sign(
        { sub: 1, email: 'forjado@example.com' },
        { secret: 'segredo-que-nao-e-o-da-aplicacao' },
      );

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${forjado}`)
        .expect(401);
    });

    it('deve aceitar token valido emitido pela propria aplicacao', async () => {
      const { token } = await registerAndLogin(app, '100010');

      await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

});
