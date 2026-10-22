const mockEnviarEmail = jest.fn();

jest.mock('nodemailer', () => ({
  createTransport: () => ({ sendMail: mockEnviarEmail }),
}));

import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getStorageToken } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  buildUserPayload,
  clearDatabase,
  registerAndLogin,
  semLimiteDeRequisicoes,
} from './e2e.utils';

describe('Recuperacao de senha (e2e)', () => {
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
    mockEnviarEmail.mockReset();
    mockEnviarEmail.mockResolvedValue({ messageId: 'id-de-teste' });
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  const pedirRecuperacao = (email: string) =>
    request(app.getHttpServer()).post('/auth/forgot-password').send({ email });

  const redefinir = (token: string, novaSenha: string) =>
    request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ token, novaSenha });

  const tokenGeradoPara = async (email: string) => {
    const usuario = await prisma.user.findUnique({ where: { email } });
    const registro = await prisma.passwordResetToken.findFirst({
      where: { userId: usuario!.id, usedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    return registro!.token;
  };

  describe('nao revelar quem tem conta', () => {
    it('deve responder igual para e-mail cadastrado e para desconhecido', async () => {
      const { user } = await registerAndLogin(app, '600001');

      const conhecido = await pedirRecuperacao(user.email);
      const desconhecido = await pedirRecuperacao('ninguem@example.com');

      expect(conhecido.status).toBe(desconhecido.status);
      expect(conhecido.body).toEqual(desconhecido.body);
    });

    it('nao deve revelar a conta quando o envio do e-mail falha', async () => {
      const { user } = await registerAndLogin(app, '600002');
      const desconhecido = await pedirRecuperacao('ninguem@example.com');

      mockEnviarEmail.mockRejectedValue(new Error('SMTP indisponivel'));
      const conhecido = await pedirRecuperacao(user.email);

      expect(conhecido.status).toBe(desconhecido.status);
      expect(conhecido.body).toEqual(desconhecido.body);
    });

    it('nao deve devolver o token na resposta', async () => {
      const { user } = await registerAndLogin(app, '600003');

      const resposta = await pedirRecuperacao(user.email);

      expect(JSON.stringify(resposta.body)).not.toContain(
        await tokenGeradoPara(user.email),
      );
    });
  });

  describe('a resposta nao pode depender do envio do e-mail', () => {
    it('deve responder sem esperar o servidor de e-mail', async () => {
      const { user } = await registerAndLogin(app, '600006');

      let liberarEnvio: () => void = () => {};
      mockEnviarEmail.mockReturnValue(
        new Promise<void>((resolve) => {
          liberarEnvio = () => resolve();
        }),
      );

      const pedido = pedirRecuperacao(user.email);

      const desfecho = await Promise.race([
        pedido.then(() => 'respondeu'),
        new Promise((resolve) => setTimeout(() => resolve('ficou esperando'), 500)),
      ]);

      liberarEnvio();
      await pedido.catch(() => undefined);

      expect(desfecho).toBe('respondeu');
    });

    it('deve mandar o token no corpo do e-mail, para quem nao abre o link', async () => {
      const { user } = await registerAndLogin(app, '600007');

      await pedirRecuperacao(user.email);

      const corpo = JSON.stringify(mockEnviarEmail.mock.calls[0][0]);

      expect(corpo).toContain(await tokenGeradoPara(user.email));
    });

    it('deve mandar o e-mail para o endereco cadastrado, e so para ele', async () => {
      const { user } = await registerAndLogin(app, '600008');

      await pedirRecuperacao(user.email);

      expect(mockEnviarEmail).toHaveBeenCalledTimes(1);
      expect(mockEnviarEmail.mock.calls[0][0].to).toBe(user.email);
    });
  });

  describe('uso concorrente do mesmo token', () => {
    it('nao deve permitir duas redefinicoes simultaneas com o mesmo token', async () => {
      const { user } = await registerAndLogin(app, '600030');
      await pedirRecuperacao(user.email);
      const token = await tokenGeradoPara(user.email);

      const [uma, outra] = await Promise.all([
        redefinir(token, 'primeiraNova123'),
        redefinir(token, 'segundaNova456'),
      ]);

      const aceitas = [uma.status, outra.status].filter((s) => s === 201);

      expect(aceitas).toHaveLength(1);
    });

    it('deve deixar apenas um pedido ativo quando dois chegam juntos', async () => {
      const { user } = await registerAndLogin(app, '600031');

      await Promise.all([
        pedirRecuperacao(user.email),
        pedirRecuperacao(user.email),
      ]);

      const usuario = await prisma.user.findUnique({ where: { email: user.email } });
      const ativos = await prisma.passwordResetToken.count({
        where: { userId: usuario!.id, usedAt: null },
      });

      expect(ativos).toBe(1);
    });
  });

  describe('isolamento entre contas', () => {
    it('o token de um usuario nao deve redefinir a senha de outro', async () => {
      const alvo = await registerAndLogin(app, '600040');
      const outro = await registerAndLogin(app, '600041');

      await pedirRecuperacao(alvo.user.email);
      const token = await tokenGeradoPara(alvo.user.email);

      await redefinir(token, 'novaSenha789').expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: outro.user.telefone, senha: outro.user.senha })
        .expect(201);
    });

    it('nao deve encerrar a sessao de outro usuario ao redefinir', async () => {
      const alvo = await registerAndLogin(app, '600042');
      const outro = await registerAndLogin(app, '600043');

      await pedirRecuperacao(alvo.user.email);
      await redefinir(await tokenGeradoPara(alvo.user.email), 'novaSenha789').expect(201);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${outro.token}`)
        .expect(200);
    });
  });

  describe('pedido pendente depois de o dono trocar a senha', () => {
    it('deve invalidar o pedido de recuperacao quando o dono troca a senha pelo perfil', async () => {
      const { user, token: sessao } = await registerAndLogin(app, '600050');

      await pedirRecuperacao(user.email);
      const tokenPendente = await tokenGeradoPara(user.email);

      await request(app.getHttpServer())
        .patch('/users/me/senha')
        .set('Authorization', `Bearer ${sessao}`)
        .send({ senhaAtual: user.senha, novaSenha: 'escolhidaPeloDono1' })
        .expect(200);

      await redefinir(tokenPendente, 'escolhidaPeloInvasor1').expect(400);
    });
  });

  describe('variacao de caixa do e-mail', () => {
    it('deve enviar quando o e-mail e digitado em maiusculas', async () => {
      const { user } = await registerAndLogin(app, '600005');

      await pedirRecuperacao(user.email.toUpperCase());

      expect(mockEnviarEmail).toHaveBeenCalled();
    });

    it('deve permitir redefinir com o codigo pedido em outra caixa', async () => {
      const { user } = await registerAndLogin(app, '600006');

      await pedirRecuperacao(user.email.toUpperCase());
      const token = await tokenGeradoPara(user.email);

      await redefinir(token, 'senhaDepoisDoCaixaAlta1').expect(201);
    });

    it('deve guardar o e-mail em minusculas, qualquer que seja a caixa digitada', async () => {
      const payload = buildUserPayload('600007');
      const comMaiusculas = { ...payload, email: payload.email.toUpperCase() };

      await request(app.getHttpServer())
        .post('/users')
        .send(comMaiusculas)
        .expect(201);

      const salvo = await prisma.user.findFirst({
        where: { email: { equals: comMaiusculas.email, mode: 'insensitive' } },
      });

      expect(salvo!.email).toBe(payload.email.toLowerCase());
    });

    it('deve recusar cadastro cujo e-mail so difere na caixa de um ja existente', async () => {
      const payload = buildUserPayload('600008');

      await request(app.getHttpServer()).post('/users').send(payload).expect(201);

      const outro = buildUserPayload('600009');
      await request(app.getHttpServer())
        .post('/users')
        .send({ ...outro, email: payload.email.toUpperCase() })
        .expect(409);
    });
  });

  describe('validade do token', () => {
    it('deve recusar token ja utilizado', async () => {
      const { user } = await registerAndLogin(app, '600010');
      await pedirRecuperacao(user.email);
      const token = await tokenGeradoPara(user.email);

      await redefinir(token, 'primeiraNova123').expect(201);
      await redefinir(token, 'segundaNova456').expect(400);
    });

    it('deve recusar token expirado', async () => {
      const { user } = await registerAndLogin(app, '600011');
      await pedirRecuperacao(user.email);
      const token = await tokenGeradoPara(user.email);

      await prisma.passwordResetToken.update({
        where: { token },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await redefinir(token, 'novaSenha789').expect(400);
    });

    it('deve invalidar o token anterior quando um novo e pedido', async () => {
      const { user } = await registerAndLogin(app, '600012');

      await pedirRecuperacao(user.email);
      const primeiro = await tokenGeradoPara(user.email);

      await pedirRecuperacao(user.email);

      await redefinir(primeiro, 'novaSenha789').expect(400);
    });

    it('deve recusar token inexistente', async () => {
      await redefinir('token-que-nunca-existiu', 'novaSenha789').expect(400);
    });
  });

  describe('redefinicao', () => {
    it('deve permitir entrar com a senha nova', async () => {
      const { user } = await registerAndLogin(app, '600020');
      await pedirRecuperacao(user.email);

      await redefinir(await tokenGeradoPara(user.email), 'novaSenha789').expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: 'novaSenha789' })
        .expect(201);
    });

    it('nao deve mais aceitar a senha antiga', async () => {
      const { user } = await registerAndLogin(app, '600021');
      await pedirRecuperacao(user.email);

      await redefinir(await tokenGeradoPara(user.email), 'novaSenha789').expect(201);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(401);
    });

    it('deve encerrar as sessoes abertas antes da redefinicao', async () => {
      const { user, token: sessaoAntiga } = await registerAndLogin(app, '600022');
      await pedirRecuperacao(user.email);

      await redefinir(await tokenGeradoPara(user.email), 'novaSenha789').expect(201);

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${sessaoAntiga}`)
        .expect(401);
    });

    it('deve recusar senha nova com menos de seis caracteres', async () => {
      const { user } = await registerAndLogin(app, '600023');
      await pedirRecuperacao(user.email);

      await redefinir(await tokenGeradoPara(user.email), 'curta').expect(400);
    });

    it('nao deve consumir o token quando a senha nova e recusada', async () => {
      const { user } = await registerAndLogin(app, '600024');
      await pedirRecuperacao(user.email);
      const token = await tokenGeradoPara(user.email);

      await redefinir(token, 'curta').expect(400);
      await redefinir(token, 'novaSenha789').expect(201);
    });
  });

  describe('entrada invalida', () => {
    it('deve exigir o e-mail', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({})
        .expect(400);
    });

    it('deve exigir token e senha nova', async () => {
      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ token: 'algum-token' })
        .expect(400);
    });
  });
});
