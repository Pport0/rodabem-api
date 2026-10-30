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

  const redefinir = (email: string, codigo: string, novaSenha: string) =>
    request(app.getHttpServer())
      .post('/auth/reset-password')
      .send({ email, codigo, novaSenha });

  const envioPara = (email: string) =>
    [...mockEnviarEmail.mock.calls]
      .reverse()
      .find(([mensagem]) => mensagem?.to === email)?.[0];

  const codigoEnviadoPara = async (email: string) => {
    for (let tentativa = 0; tentativa < 100; tentativa++) {
      const mensagem = envioPara(email);
      const achado = String(mensagem?.html ?? '').match(/\b\d{8}\b/);
      if (achado) return achado[0];
      await new Promise((resolve) => setImmediate(resolve));
    }
    throw new Error(`Nenhum e-mail com codigo foi enviado para ${email}`);
  };

  const pedidosAtivosDe = async (email: string) => {
    const usuario = await prisma.user.findUnique({ where: { email } });
    return prisma.passwordResetToken.count({ where: { userId: usuario!.id } });
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

    it('nao deve devolver o codigo na resposta', async () => {
      const { user } = await registerAndLogin(app, '600003');

      const resposta = await pedirRecuperacao(user.email);
      const codigo = await codigoEnviadoPara(user.email);

      expect(JSON.stringify(resposta.body)).not.toContain(codigo);
    });

    it('deve recusar e-mail inexistente com a mesma mensagem de codigo invalido', async () => {
      const { user } = await registerAndLogin(app, '600004');
      await pedirRecuperacao(user.email);
      const codigo = await codigoEnviadoPara(user.email);

      const semConta = await redefinir('ninguem@example.com', codigo, 'novaSenha789');
      const codigoErrado = await redefinir(user.email, '00000000', 'novaSenha789');

      expect(semConta.status).toBe(codigoErrado.status);
      expect(semConta.body.message).toBe(codigoErrado.body.message);
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

    it('deve mandar o codigo no corpo do e-mail, porque e o unico caminho', async () => {
      const { user } = await registerAndLogin(app, '600007');

      await pedirRecuperacao(user.email);

      expect(await codigoEnviadoPara(user.email)).toMatch(/^\d{8}$/);
    });

    it('deve mandar o e-mail para o endereco cadastrado, e so para ele', async () => {
      const { user } = await registerAndLogin(app, '600008');

      await pedirRecuperacao(user.email);
      await codigoEnviadoPara(user.email);

      expect(mockEnviarEmail).toHaveBeenCalledTimes(1);
      expect(mockEnviarEmail.mock.calls[0][0].to).toBe(user.email);
    });
  });

  describe('formato do codigo', () => {
    it('deve ter oito digitos, preservando o zero a esquerda', async () => {
      const { user } = await registerAndLogin(app, '600009');

      await pedirRecuperacao(user.email);
      const codigo = await codigoEnviadoPara(user.email);

      expect(codigo).toHaveLength(8);
      expect(codigo).toMatch(/^\d{8}$/);
    });

    it('nao deve repetir o codigo entre dois pedidos', async () => {
      const { user } = await registerAndLogin(app, '600010');

      await pedirRecuperacao(user.email);
      const primeiro = await codigoEnviadoPara(user.email);

      mockEnviarEmail.mockClear();
      await pedirRecuperacao(user.email);
      const segundo = await codigoEnviadoPara(user.email);

      expect(segundo).not.toBe(primeiro);
    });

    it('nao deve guardar o codigo em texto puro no banco', async () => {
      const { user } = await registerAndLogin(app, '600011');

      await pedirRecuperacao(user.email);
      const codigo = await codigoEnviadoPara(user.email);

      const usuario = await prisma.user.findUnique({ where: { email: user.email } });
      const registro = await prisma.passwordResetToken.findFirst({
        where: { userId: usuario!.id },
      });

      expect(JSON.stringify(registro)).not.toContain(codigo);
    });
  });

  describe('uso concorrente do mesmo codigo', () => {
    it('nao deve permitir duas redefinicoes simultaneas com o mesmo codigo', async () => {
      const { user } = await registerAndLogin(app, '600030');
      await pedirRecuperacao(user.email);
      const codigo = await codigoEnviadoPara(user.email);

      const [uma, outra] = await Promise.all([
        redefinir(user.email, codigo, 'primeiraNova123'),
        redefinir(user.email, codigo, 'segundaNova456'),
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

      expect(await pedidosAtivosDe(user.email)).toBe(1);
    });
  });

  describe('limite de tentativas', () => {
    it('deve recusar codigo errado sem apagar o pedido em curso', async () => {
      const { user } = await registerAndLogin(app, '600060');
      await pedirRecuperacao(user.email);
      const codigo = await codigoEnviadoPara(user.email);

      await redefinir(user.email, '00000000', 'novaSenha789').expect(400);

      await redefinir(user.email, codigo, 'novaSenha789').expect(201);
    });

    it('deve invalidar o pedido depois de esgotar as tentativas', async () => {
      const { user } = await registerAndLogin(app, '600061');
      await pedirRecuperacao(user.email);
      const codigo = await codigoEnviadoPara(user.email);

      for (let tentativa = 0; tentativa < 5; tentativa++) {
        await redefinir(user.email, '00000000', 'novaSenha789').expect(400);
      }

      await redefinir(user.email, codigo, 'novaSenha789').expect(400);
      expect(await pedidosAtivosDe(user.email)).toBe(0);
    });

    it('nao deve contar tentativa quando o codigo esta certo', async () => {
      const { user } = await registerAndLogin(app, '600062');
      await pedirRecuperacao(user.email);
      const codigo = await codigoEnviadoPara(user.email);

      await redefinir(user.email, codigo, 'curta').expect(400);
      await redefinir(user.email, codigo, 'novaSenha789').expect(201);
    });
  });

  describe('isolamento entre contas', () => {
    it('o codigo de um usuario nao deve redefinir a senha de outro', async () => {
      const alvo = await registerAndLogin(app, '600040');
      const outro = await registerAndLogin(app, '600041');

      await pedirRecuperacao(alvo.user.email);
      const codigo = await codigoEnviadoPara(alvo.user.email);

      await redefinir(outro.user.email, codigo, 'invadida999').expect(400);

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: outro.user.telefone, senha: outro.user.senha })
        .expect(201);
    });

    it('nao deve encerrar a sessao de outro usuario ao redefinir', async () => {
      const alvo = await registerAndLogin(app, '600042');
      const outro = await registerAndLogin(app, '600043');

      await pedirRecuperacao(alvo.user.email);
      const codigo = await codigoEnviadoPara(alvo.user.email);

      await redefinir(alvo.user.email, codigo, 'novaSenha789').expect(201);

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
      const codigoPendente = await codigoEnviadoPara(user.email);

      await request(app.getHttpServer())
        .patch('/users/me/senha')
        .set('Authorization', `Bearer ${sessao}`)
        .send({ senhaAtual: user.senha, novaSenha: 'escolhidaPeloDono1' })
        .expect(200);

      await redefinir(user.email, codigoPendente, 'escolhidaPeloInvasor1').expect(400);
    });
  });

  describe('variacao de caixa do e-mail', () => {
    it('deve enviar quando o e-mail e digitado em maiusculas', async () => {
      const { user } = await registerAndLogin(app, '600005');

      await pedirRecuperacao(user.email.toUpperCase());

      expect(await codigoEnviadoPara(user.email)).toMatch(/^\d{8}$/);
    });

    it('deve permitir redefinir com o codigo pedido em outra caixa', async () => {
      const { user } = await registerAndLogin(app, '600006b');

      await pedirRecuperacao(user.email.toUpperCase());
      const codigo = await codigoEnviadoPara(user.email);

      await redefinir(user.email.toUpperCase(), codigo, 'senhaDepoisDoCaixaAlta1').expect(201);
    });

    it('deve guardar o e-mail em minusculas, qualquer que seja a caixa digitada', async () => {
      const payload = buildUserPayload('600007b');
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
      const payload = buildUserPayload('600008b');

      await request(app.getHttpServer()).post('/users').send(payload).expect(201);

      const outro = buildUserPayload('600009b');
      await request(app.getHttpServer())
        .post('/users')
        .send({ ...outro, email: payload.email.toUpperCase() })
        .expect(409);
    });
  });

  describe('validade do codigo', () => {
    it('deve recusar codigo ja utilizado', async () => {
      const { user } = await registerAndLogin(app, '600012');
      await pedirRecuperacao(user.email);
      const codigo = await codigoEnviadoPara(user.email);

      await redefinir(user.email, codigo, 'primeiraNova123').expect(201);
      await redefinir(user.email, codigo, 'segundaNova456').expect(400);
    });

    it('deve recusar codigo expirado', async () => {
      const { user } = await registerAndLogin(app, '600013');
      await pedirRecuperacao(user.email);
      const codigo = await codigoEnviadoPara(user.email);

      const usuario = await prisma.user.findUnique({ where: { email: user.email } });
      await prisma.passwordResetToken.updateMany({
        where: { userId: usuario!.id },
        data: { expiresAt: new Date(Date.now() - 1000) },
      });

      await redefinir(user.email, codigo, 'novaSenha789').expect(400);
    });

    it('deve invalidar o codigo anterior quando um novo e pedido', async () => {
      const { user } = await registerAndLogin(app, '600014');

      await pedirRecuperacao(user.email);
      const primeiro = await codigoEnviadoPara(user.email);

      mockEnviarEmail.mockClear();
      await pedirRecuperacao(user.email);
      await codigoEnviadoPara(user.email);

      await redefinir(user.email, primeiro, 'novaSenha789').expect(400);
    });

    it('deve recusar codigo que nunca existiu', async () => {
      const { user } = await registerAndLogin(app, '600015');

      await redefinir(user.email, '12345678', 'novaSenha789').expect(400);
    });
  });

  describe('redefinicao', () => {
    const redefinirPara = async (sufixo: string, novaSenha: string) => {
      const { user, token } = await registerAndLogin(app, sufixo);
      await pedirRecuperacao(user.email);
      const codigo = await codigoEnviadoPara(user.email);
      await redefinir(user.email, codigo, novaSenha).expect(201);
      return { user, token };
    };

    it('deve permitir entrar com a senha nova', async () => {
      const { user } = await redefinirPara('600020', 'novaSenha789');

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: 'novaSenha789' })
        .expect(201);
    });

    it('nao deve mais aceitar a senha antiga', async () => {
      const { user } = await redefinirPara('600021', 'novaSenha789');

      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: user.senha })
        .expect(401);
    });

    it('deve encerrar as sessoes abertas antes da redefinicao', async () => {
      const { token: sessaoAntiga } = await redefinirPara('600022', 'novaSenha789');

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${sessaoAntiga}`)
        .expect(401);
    });

    it('deve apagar o pedido depois de redefinir', async () => {
      const { user } = await redefinirPara('600023', 'novaSenha789');

      expect(await pedidosAtivosDe(user.email)).toBe(0);
    });

    it('deve recusar senha nova com menos de seis caracteres', async () => {
      const { user } = await registerAndLogin(app, '600024');
      await pedirRecuperacao(user.email);
      const codigo = await codigoEnviadoPara(user.email);

      await redefinir(user.email, codigo, 'curta').expect(400);
    });
  });

  describe('entrada invalida', () => {
    it('deve exigir o e-mail no pedido de recuperacao', async () => {
      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({})
        .expect(400);
    });

    it('deve exigir e-mail, codigo e senha nova na redefinicao', async () => {
      const { user } = await registerAndLogin(app, '600025');

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ email: user.email })
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ email: user.email, codigo: '12345678' })
        .expect(400);

      await request(app.getHttpServer())
        .post('/auth/reset-password')
        .send({ codigo: '12345678', novaSenha: 'novaSenha789' })
        .expect(400);
    });
  });
});
