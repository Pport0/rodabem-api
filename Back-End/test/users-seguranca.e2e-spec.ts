import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { buildUserPayload, clearDatabase, registerAndLogin } from './e2e.utils';

describe('Usuarios - seguranca (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let jwt: JwtService;

  const autenticar = async (sufixo: string) => {
    const { user, token } = await registerAndLogin(app, sufixo);
    const perfil = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${token}`);
    return { user, token, id: perfil.body.id as number };
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
    jwt = app.get(JwtService);
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await app.close();
  });

  describe('exposicao de dados sensiveis', () => {
    it('nenhuma resposta de usuario deve conter hash de senha', async () => {
      const { token, id } = await autenticar('400001');

      const respostas = await Promise.all([
        request(app.getHttpServer()).get('/users/me').set('Authorization', `Bearer ${token}`),
        request(app.getHttpServer()).get('/users').set('Authorization', `Bearer ${token}`),
        request(app.getHttpServer())
          .put(`/users/${id}`)
          .set('Authorization', `Bearer ${token}`)
          .send({ nome: 'Alterado' }),
      ]);

      for (const resposta of respostas) {
        const corpo = JSON.stringify(resposta.body);
        expect(corpo).not.toContain('senhaHash');
        expect(corpo).not.toContain('$2b$');
      }
    });

    it('nenhuma resposta deve conter o cpf cifrado nem o hash do cpf', async () => {
      const { token } = await autenticar('400002');

      const resposta = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`);

      const corpo = JSON.stringify(resposta.body);
      expect(corpo).not.toContain('cpfEncrypted');
      expect(corpo).not.toContain('cpfHash');
    });

    it('a senha enviada no cadastro nunca volta na resposta', async () => {
      const payload = buildUserPayload('400003');

      const resposta = await request(app.getHttpServer())
        .post('/users')
        .send(payload)
        .expect(201);

      expect(JSON.stringify(resposta.body)).not.toContain(payload.senha);
    });

    it('a mensagem de erro de login nao revela se o usuario existe', async () => {
      const { user } = await autenticar('400004');

      const inexistente = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: '62000000000', senha: '123456' })
        .expect(401);

      const senhaErrada = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: 'senha-errada' })
        .expect(401);

      expect(inexistente.body.message).toBe(senhaErrada.body.message);
    });
  });

  describe('manipulacao de token', () => {
    it('deve recusar token assinado com outro segredo', async () => {
      const forjado = jwt.sign({ sub: 1, email: 'x@y.com' }, { secret: 'segredo-falso' });

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${forjado}`)
        .expect(401);
    });

    it('deve recusar token expirado', async () => {
      const expirado = jwt.sign({ sub: 1, email: 'x@y.com' }, { expiresIn: '-1s' });

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${expirado}`)
        .expect(401);
    });

    it('deve recusar token com payload adulterado', async () => {
      const { token } = await autenticar('400010');
      const [cabecalho, , assinatura] = token.split('.');
      const payloadFalso = Buffer.from(
        JSON.stringify({ sub: 99999, email: 'invasor@example.com' }),
      ).toString('base64url');

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${cabecalho}.${payloadFalso}.${assinatura}`)
        .expect(401);
    });

    it('deve recusar token sem assinatura', async () => {
      const { token } = await autenticar('400011');
      const [cabecalho, payload] = token.split('.');

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${cabecalho}.${payload}.`)
        .expect(401);
    });

    it('deve recusar texto arbitrario no lugar do token', async () => {
      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', 'Bearer nao-sou-um-token')
        .expect(401);
    });
  });

  describe('acesso a dados de outro usuario', () => {
    it('nao deve permitir editar outro usuario mesmo conhecendo o identificador', async () => {
      const invasor = await autenticar('400020');
      const vitima = await autenticar('400021');

      await request(app.getHttpServer())
        .put(`/users/${vitima.id}`)
        .set('Authorization', `Bearer ${invasor.token}`)
        .send({ email: 'sequestrado@example.com' })
        .expect(403);

      const perfil = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${vitima.token}`)
        .expect(200);

      expect(perfil.body.email).toBe(vitima.user.email);
    });

    it('nao deve permitir excluir outro usuario', async () => {
      const invasor = await autenticar('400022');
      const vitima = await autenticar('400023');

      await request(app.getHttpServer())
        .delete(`/users/${vitima.id}`)
        .set('Authorization', `Bearer ${invasor.token}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${vitima.token}`)
        .expect(200);
    });

    it('a troca de senha ignora qualquer identificador enviado no corpo', async () => {
      const invasor = await autenticar('400024');
      const vitima = await autenticar('400025');

      await request(app.getHttpServer())
        .patch('/users/me/senha')
        .set('Authorization', `Bearer ${invasor.token}`)
        .send({
          id: vitima.id,
          userId: vitima.id,
          senhaAtual: invasor.user.senha,
          novaSenha: 'novaSenha456',
        })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: vitima.user.telefone, senha: vitima.user.senha })
        .expect(201);
    });
  });

  describe('entradas maliciosas', () => {
    it('deve tratar tentativa de injecao no filtro de nome como texto literal', async () => {
      const { token } = await autenticar('400030');

      await request(app.getHttpServer())
        .get('/users')
        .query({ nome: "'; DROP TABLE \"User\"; --" })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('deve tratar tentativa de injecao no login como credencial invalida', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: "' OR '1'='1", senha: "' OR '1'='1" })
        .expect(401);
    });

    it('nao deve permitir escalar privilegio enviando campos extras no cadastro', async () => {
      const payload = buildUserPayload('400031');

      const resposta = await request(app.getHttpServer())
        .post('/users')
        .send({ ...payload, status: false, id: 99999, senhaHash: 'injetado' })
        .expect(201);

      expect(resposta.body.id).not.toBe(99999);
      expect(JSON.stringify(resposta.body)).not.toContain('injetado');
    });

    it('aceita campos sensiveis no corpo da edicao de perfil', async () => {
      const { token, id } = await autenticar('400032');

      await request(app.getHttpServer())
        .put(`/users/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Alterado', senhaHash: 'injetado' })
        .expect(200);
    });

    it('a injecao de senhaHash na edicao de perfil invalida o acesso do usuario', async () => {
      const { token, id, user } = await autenticar('400034');

      await request(app.getHttpServer())
        .put(`/users/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Alterado', senhaHash: 'injetado' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(401);
    });

    it('a injecao de status na edicao de perfil desativa a conta', async () => {
      const { token, id, user } = await autenticar('400035');

      await request(app.getHttpServer())
        .put(`/users/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Alterado', status: false })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(401);
    });

    it('deve suportar payload muito extenso sem derrubar a aplicacao', async () => {
      const { token, id } = await autenticar('400033');

      await request(app.getHttpServer())
        .put(`/users/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'a'.repeat(50000) });

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });
});
