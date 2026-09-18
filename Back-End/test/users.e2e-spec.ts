import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  buildUserPayload,
  buildValidCpf,
  clearDatabase,
  createTruck,
  registerAndLogin,
} from './e2e.utils';

describe('Usuarios (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  beforeEach(async () => {
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await app.close();
  });

  describe('POST /users', () => {
    it('deve cadastrar usuario com dados validos', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/users')
        .send(buildUserPayload('300001'))
        .expect(201);

      expect(resposta.body.id).toBeDefined();
    });

    it('nunca deve devolver senha nem cpf na resposta do cadastro', async () => {
      const payload = buildUserPayload('300002');

      const resposta = await request(app.getHttpServer())
        .post('/users')
        .send(payload)
        .expect(201);

      const corpo = JSON.stringify(resposta.body);
      expect(corpo).not.toContain(payload.senha);
      expect(corpo).not.toContain(payload.cpf);
      expect(resposta.body).not.toHaveProperty('senhaHash');
      expect(resposta.body).not.toHaveProperty('cpfEncrypted');
      expect(resposta.body).not.toHaveProperty('cpfHash');
    });

    it('deve recusar cpf invalido', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/users')
        .send({ ...buildUserPayload('300003'), cpf: '11111111111' })
        .expect(400);

      expect(resposta.body.message).toBe('CPF inválido.');
    });

    it('deve recusar cpf ja cadastrado', async () => {
      const payload = buildUserPayload('300004');
      await request(app.getHttpServer()).post('/users').send(payload).expect(201);

      const resposta = await request(app.getHttpServer())
        .post('/users')
        .send({ ...payload, email: 'outro@example.com', telefone: '62999000111' })
        .expect(409);

      expect(resposta.body.message).toBe('CPF já cadastrado');
    });

    it('deve recusar email ja cadastrado', async () => {
      const payload = buildUserPayload('300005');
      await request(app.getHttpServer()).post('/users').send(payload).expect(201);

      const resposta = await request(app.getHttpServer())
        .post('/users')
        .send({ ...payload, cpf: buildValidCpf('300006'), telefone: '62999000222' })
        .expect(409);

      expect(resposta.body.message).toBe('E-mail já cadastrado');
    });

    it('deve permitir cadastro sem autenticacao', async () => {
      await request(app.getHttpServer())
        .post('/users')
        .send(buildUserPayload('300007'))
        .expect(201);
    });
  });

  describe('GET /users/me', () => {
    it('deve devolver o perfil do usuario autenticado', async () => {
      const { user, token } = await autenticar('300010');

      const resposta = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body).toMatchObject({
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
      });
    });

    it('deve devolver o cpf decifrado', async () => {
      const { user, token } = await autenticar('300011');

      const resposta = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body.cpf).toBe(user.cpf);
    });

    it('nunca deve expor a senha nem o cpf cifrado', async () => {
      const { token } = await autenticar('300012');

      const resposta = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body).not.toHaveProperty('senhaHash');
      expect(resposta.body).not.toHaveProperty('cpfEncrypted');
      expect(resposta.body).not.toHaveProperty('cpfHash');
    });

    it('deve exigir autenticacao', async () => {
      await request(app.getHttpServer()).get('/users/me').expect(401);
    });

    it('deve recusar token invalidado por logout', async () => {
      const { token } = await autenticar('300013');

      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);
    });
  });

  describe('GET /users', () => {
    it('devolve apenas o usuario autenticado, ignorando os filtros de busca', async () => {
      const { user, token } = await autenticar('300020');
      await registerAndLogin(app, '300021');

      const resposta = await request(app.getHttpServer())
        .get('/users')
        .query({ page: 1, limit: 50, nome: 'Usuario', status: 'true' })
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(Array.isArray(resposta.body)).toBe(false);
      expect(resposta.body).not.toHaveProperty('data');
      expect(resposta.body.email).toBe(user.email);
    });

    it('deve exigir autenticacao', async () => {
      await request(app.getHttpServer()).get('/users').expect(401);
    });
  });

  describe('PUT /users/:id', () => {
    it('deve permitir editar o proprio cadastro', async () => {
      const { token, id } = await autenticar('300030');

      const resposta = await request(app.getHttpServer())
        .put(`/users/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Nome Alterado' })
        .expect(200);

      expect(resposta.body.nome).toBe('Nome Alterado');
    });

    it('deve impedir editar o cadastro de outro usuario', async () => {
      const primeiro = await autenticar('300031');
      const segundo = await autenticar('300032');

      const resposta = await request(app.getHttpServer())
        .put(`/users/${segundo.id}`)
        .set('Authorization', `Bearer ${primeiro.token}`)
        .send({ nome: 'Invadido' })
        .expect(403);

      expect(resposta.body.message).toBe(
        'Você não tem permissão para editar este usuário.',
      );
    });

    it('nao deve alterar os dados do outro usuario ao recusar', async () => {
      const primeiro = await autenticar('300033');
      const segundo = await autenticar('300034');

      await request(app.getHttpServer())
        .put(`/users/${segundo.id}`)
        .set('Authorization', `Bearer ${primeiro.token}`)
        .send({ nome: 'Invadido' })
        .expect(403);

      const perfil = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${segundo.token}`)
        .expect(200);

      expect(perfil.body.nome).toBe(segundo.user.nome);
    });

    it('nunca deve devolver campos sensiveis apos a edicao', async () => {
      const { token, id } = await autenticar('300035');

      const resposta = await request(app.getHttpServer())
        .put(`/users/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ nome: 'Nome Alterado' })
        .expect(200);

      expect(resposta.body).not.toHaveProperty('senhaHash');
      expect(resposta.body).not.toHaveProperty('cpfEncrypted');
    });

    it('deve exigir autenticacao', async () => {
      await request(app.getHttpServer()).put('/users/1').send({ nome: 'x' }).expect(401);
    });
  });

  describe('DELETE /users/:id', () => {
    it('deve permitir excluir o proprio cadastro sem vinculos', async () => {
      const { token, id } = await autenticar('300040');

      const resposta = await request(app.getHttpServer())
        .delete(`/users/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(resposta.body.message).toBe('Usuário excluído com sucesso!');
    });

    it('deve impedir excluir o cadastro de outro usuario', async () => {
      const primeiro = await autenticar('300041');
      const segundo = await autenticar('300042');

      const resposta = await request(app.getHttpServer())
        .delete(`/users/${segundo.id}`)
        .set('Authorization', `Bearer ${primeiro.token}`)
        .expect(403);

      expect(resposta.body.message).toBe(
        'Você não tem permissão para excluir este usuário.',
      );
    });

    it('nao deve excluir o outro usuario ao recusar', async () => {
      const primeiro = await autenticar('300043');
      const segundo = await autenticar('300044');

      await request(app.getHttpServer())
        .delete(`/users/${segundo.id}`)
        .set('Authorization', `Bearer ${primeiro.token}`)
        .expect(403);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${segundo.token}`)
        .expect(200);
    });

    it('deve impedir exclusao quando ha caminhao vinculado', async () => {
      const { token, id } = await autenticar('300045');
      await createTruck(app, token).expect(201);

      const resposta = await request(app.getHttpServer())
        .delete(`/users/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(resposta.body.message).toMatch(/caminhão cadastrado/);
    });

    it('deve manter o usuario ativo apos recusar a exclusao por vinculo', async () => {
      const { token, id } = await autenticar('300046');
      await createTruck(app, token).expect(201);

      await request(app.getHttpServer())
        .delete(`/users/${id}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });

    it('deve exigir autenticacao', async () => {
      await request(app.getHttpServer()).delete('/users/1').expect(401);
    });
  });

  describe('PATCH /users/me/senha', () => {
    it('deve alterar a senha com a senha atual correta', async () => {
      const { user, token } = await autenticar('300050');

      const resposta = await request(app.getHttpServer())
        .patch('/users/me/senha')
        .set('Authorization', `Bearer ${token}`)
        .send({ senhaAtual: user.senha, novaSenha: 'novaSenha456' })
        .expect(200);

      expect(resposta.body.message).toBe('Senha alterada com sucesso.');
    });

    it('deve permitir autenticar com a nova senha', async () => {
      const { user, token } = await autenticar('300051');

      await request(app.getHttpServer())
        .patch('/users/me/senha')
        .set('Authorization', `Bearer ${token}`)
        .send({ senhaAtual: user.senha, novaSenha: 'novaSenha456' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: 'novaSenha456' })
        .expect(201);
    });

    it('deve invalidar a senha anterior', async () => {
      const { user, token } = await autenticar('300052');

      await request(app.getHttpServer())
        .patch('/users/me/senha')
        .set('Authorization', `Bearer ${token}`)
        .send({ senhaAtual: user.senha, novaSenha: 'novaSenha456' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(401);
    });

    it('deve recusar senha atual incorreta', async () => {
      const { token } = await autenticar('300053');

      const resposta = await request(app.getHttpServer())
        .patch('/users/me/senha')
        .set('Authorization', `Bearer ${token}`)
        .send({ senhaAtual: 'senha-errada', novaSenha: 'novaSenha456' })
        .expect(400);

      expect(resposta.body.message).toBe('Senha atual incorreta.');
    });

    it('deve recusar nova senha com menos de seis caracteres', async () => {
      const { user, token } = await autenticar('300054');

      const resposta = await request(app.getHttpServer())
        .patch('/users/me/senha')
        .set('Authorization', `Bearer ${token}`)
        .send({ senhaAtual: user.senha, novaSenha: '12345' })
        .expect(400);

      expect(resposta.body.message).toBe(
        'A nova senha deve ter pelo menos 6 caracteres.',
      );
    });

    it('nao deve alterar a senha quando a nova e curta demais', async () => {
      const { user, token } = await autenticar('300055');

      await request(app.getHttpServer())
        .patch('/users/me/senha')
        .set('Authorization', `Bearer ${token}`)
        .send({ senhaAtual: user.senha, novaSenha: '12345' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(201);
    });

    it('nao deve alterar a senha de outro usuario', async () => {
      const primeiro = await autenticar('300056');
      const segundo = await autenticar('300057');

      await request(app.getHttpServer())
        .patch('/users/me/senha')
        .set('Authorization', `Bearer ${primeiro.token}`)
        .send({ senhaAtual: primeiro.user.senha, novaSenha: 'novaSenha456' })
        .expect(200);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: segundo.user.telefone, senha: segundo.user.senha })
        .expect(201);
    });

    it('deve exigir autenticacao', async () => {
      await request(app.getHttpServer())
        .patch('/users/me/senha')
        .send({ senhaAtual: 'x', novaSenha: 'novaSenha456' })
        .expect(401);
    });
  });
});
