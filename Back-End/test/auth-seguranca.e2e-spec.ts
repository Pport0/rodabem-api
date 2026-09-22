import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildUserPayload, clearDatabase, registerAndLogin } from './e2e.utils';

describe('Autenticacao - seguranca (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const tokenComAlgNone = (sub: number) => {
    const cabecalho = Buffer.from(
      JSON.stringify({ alg: 'none', typ: 'JWT' }),
    ).toString('base64url');
    const payload = Buffer.from(
      JSON.stringify({ sub, email: 'invasor@example.com' }),
    ).toString('base64url');
    return `${cabecalho}.${payload}.`;
  };

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

  describe('falsificacao de token', () => {
    it('deve recusar token com algoritmo none', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${tokenComAlgNone(1)}`)
        .expect(401);
    });

    it('deve recusar token de um usuario reaproveitado apos ele ser excluido', async () => {
      const { token } = await registerAndLogin(app, '500001');
      const perfil = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`);

      await request(app.getHttpServer())
        .delete(`/users/${perfil.body.id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('deve recusar prefixo diferente de Bearer', async () => {
      const { token } = await registerAndLogin(app, '500002');

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Basic ${token}`)
        .expect(401);
    });

    it('deve recusar token sem os tres segmentos', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer abc.def')
        .expect(401);
    });
  });

  describe('sessao apos troca de senha', () => {
    it('o token anterior continua valido depois da troca de senha', async () => {
      const { user, token } = await registerAndLogin(app, '500010');

      await request(app.getHttpServer())
        .patch('/users/me/senha')
        .set('Authorization', `Bearer ${token}`)
        .send({ senhaAtual: user.senha, novaSenha: 'novaSenha456' })
        .expect(200);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('sessoes abertas em outros aparelhos sobrevivem a troca de senha', async () => {
      const { user } = await registerAndLogin(app, '500011');

      const primeiraSessao = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(201);

      const segundaSessao = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(201);

      await request(app.getHttpServer())
        .patch('/users/me/senha')
        .set('Authorization', `Bearer ${primeiraSessao.body.access_token}`)
        .send({ senhaAtual: user.senha, novaSenha: 'novaSenha456' })
        .expect(200);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${segundaSessao.body.access_token}`)
        .expect(200);
    });
  });

  describe('encerramento de sessao', () => {
    it('dois logins do mesmo usuario no mesmo segundo devolvem o token identico', async () => {
      const { user } = await registerAndLogin(app, '500020');

      const sessaoA = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(201);

      const sessaoB = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(201);

      expect(sessaoB.body.access_token).toBe(sessaoA.body.access_token);
    });

    it('o token nao carrega identificador de sessao', async () => {
      const { token } = await registerAndLogin(app, '500021');
      const payload = JSON.parse(
        Buffer.from(token.split('.')[1], 'base64url').toString(),
      );

      expect(payload).not.toHaveProperty('jti');
      expect(Object.keys(payload).sort()).toEqual(['email', 'exp', 'iat', 'sub']);
    });

    it('o logout derruba todas as sessoes abertas no mesmo segundo', async () => {
      const { user } = await registerAndLogin(app, '500022');

      const sessaoA = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(201);

      const sessaoB = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(201);

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${sessaoA.body.access_token}`)
        .expect(201);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${sessaoB.body.access_token}`)
        .expect(401);
    });

    it('cada logout de token distinto acrescenta um registro permanente na blacklist', async () => {
      const antes = await prisma.tokenBlackList.count();

      for (let i = 0; i < 3; i++) {
        const { token } = await registerAndLogin(app, `50003${i}`);

        await request(app.getHttpServer())
          .post('/auth/logout')
          .set('Authorization', `Bearer ${token}`)
          .expect(201);
      }

      expect(await prisma.tokenBlackList.count()).toBe(antes + 3);
    });

    it('nao deve permitir invalidar o token de outro usuario', async () => {
      const primeiro = await registerAndLogin(app, '500022');
      const segundo = await registerAndLogin(app, '500023');

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${primeiro.token}`)
        .send({ token: segundo.token })
        .expect(201);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${segundo.token}`)
        .expect(200);
    });
  });

  describe('tentativas repetidas de autenticacao', () => {
    it('aceita tentativas ilimitadas de login sem bloquear a conta', async () => {
      const { user } = await registerAndLogin(app, '500030');

      for (let i = 0; i < 12; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ telefone: user.telefone, senha: `tentativa-${i}` })
          .expect(401);
      }

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(201);
    });
  });

  describe('entradas maliciosas no login', () => {
    it('deve tratar tentativa de injecao como credencial invalida', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: "' OR 1=1 --", senha: "' OR 1=1 --" })
        .expect(401);
    });

    it('deve recusar tipos inesperados nos campos de credencial', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: { $ne: null }, senha: { $ne: null } });

      expect(resposta.status).not.toBe(201);
    });

    it('deve suportar senha muito extensa sem derrubar a aplicacao', async () => {
      const { user } = await registerAndLogin(app, '500040');

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: 'a'.repeat(20000) })
        .expect(401);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(201);
    });

    it('nao deve autenticar informando apenas a senha', async () => {
      const { user } = await registerAndLogin(app, '500041');

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ senha: user.senha })
        .expect(401);
    });

    it('aceita senha abaixo do minimo declarado no DTO, pois nao ha ValidationPipe', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: '62000000000', senha: '1' });

      expect(resposta.status).toBe(401);
      expect(resposta.status).not.toBe(400);
    });
  });

  describe('cadastro e enumeracao de contas', () => {
    it('a recusa por cpf duplicado revela que o cpf ja existe', async () => {
      const payload = buildUserPayload('500050');
      await request(app.getHttpServer()).post('/users').send(payload).expect(201);

      const resposta = await request(app.getHttpServer())
        .post('/users')
        .send({ ...payload, email: 'outro@example.com', telefone: '62999111222' })
        .expect(409);

      expect(resposta.body.message).toBe('CPF já cadastrado');
    });

    it('a recusa por email duplicado revela que o email ja existe', async () => {
      const payload = buildUserPayload('500051');
      await request(app.getHttpServer()).post('/users').send(payload).expect(201);

      const resposta = await request(app.getHttpServer())
        .post('/users')
        .send({
          ...payload,
          cpf: buildUserPayload('500052').cpf,
          telefone: '62999333444',
        })
        .expect(409);

      expect(resposta.body.message).toBe('E-mail já cadastrado');
    });
  });
});
