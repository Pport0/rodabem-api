import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getStorageToken } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearDatabase, createTruck, registerAndLogin,
  semLimiteDeRequisicoes,
} from './e2e.utils';

describe('Documentos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const DIA = 24 * 60 * 60 * 1000;
  const emDias = (dias: number) =>
    new Date(Date.now() + dias * DIA).toISOString();

  const documentoValido = (extra: Record<string, unknown> = {}) => ({
    nome: 'CRLV',
    numero: '123456789',
    dataEmissao: emDias(-365),
    dataVencimento: emDias(365),
    ...extra,
  });

  const criar = (token: string, corpo: Record<string, unknown>) =>
    request(app.getHttpServer())
      .post('/documentos')
      .set('Authorization', `Bearer ${token}`)
      .send(corpo);

  const listar = (token: string) =>
    request(app.getHttpServer())
      .get('/documentos')
      .set('Authorization', `Bearer ${token}`);

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getStorageToken())
      .useValue(semLimiteDeRequisicoes).compile();

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

  describe('cadastro', () => {
    it('deve cadastrar documento com os campos informados', async () => {
      const dono = await registerAndLogin(app, '200001');

      const resposta = await criar(dono.token, documentoValido());

      expect(resposta.status).toBe(201);
      expect(resposta.body.documento).toMatchObject({
        nome: 'CRLV',
        numero: '123456789',
      });
    });

    it('deve recusar cadastro sem data de emissao ou sem data de vencimento', async () => {
      const dono = await registerAndLogin(app, '200002');

      const semEmissao = documentoValido();
      delete (semEmissao as Record<string, unknown>).dataEmissao;
      const semVencimento = documentoValido();
      delete (semVencimento as Record<string, unknown>).dataVencimento;

      await expect(
        criar(dono.token, semEmissao).then((r) => r.status),
      ).resolves.toBe(400);
      await expect(
        criar(dono.token, semVencimento).then((r) => r.status),
      ).resolves.toBe(400);
    });

    it('deve recusar vencimento anterior a emissao', async () => {
      const dono = await registerAndLogin(app, '200003');

      const resposta = await criar(
        dono.token,
        documentoValido({
          dataEmissao: emDias(10),
          dataVencimento: emDias(-10),
        }),
      );

      expect(resposta.status).toBe(400);
    });

    it('deve exigir autenticacao', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/documentos')
        .send(documentoValido());

      expect(resposta.status).toBe(401);
    });
  });

  describe('vinculo', () => {
    it('deve registrar vinculo de caminhao quando um caminhao e informado', async () => {
      const dono = await registerAndLogin(app, '200004');
      const caminhao = await createTruck(app, dono.token);

      await criar(
        dono.token,
        documentoValido({ caminhaoId: caminhao.body.caminhao.id }),
      );

      const lista = await listar(dono.token);
      expect(lista.body[0].vinculo).toBe('CAMINHAO');
    });

    it('deve registrar vinculo de motorista quando nenhum caminhao e informado', async () => {
      const dono = await registerAndLogin(app, '200005');

      await criar(dono.token, documentoValido());

      const lista = await listar(dono.token);
      expect(lista.body[0].vinculo).toBe('MOTORISTA');
    });

    it('deve recusar vinculo a caminhao de outro usuario', async () => {
      const dono = await registerAndLogin(app, '200006');
      const intruso = await registerAndLogin(app, '200007');
      const caminhao = await createTruck(app, dono.token);

      const resposta = await criar(
        intruso.token,
        documentoValido({ caminhaoId: caminhao.body.caminhao.id }),
      );

      expect(resposta.status).toBe(403);
    });
  });

  describe('listagem', () => {
    it('deve listar apenas os documentos do proprio usuario, separados por tipo de vinculo', async () => {
      const dono = await registerAndLogin(app, '200008');
      const outro = await registerAndLogin(app, '200009');
      const caminhao = await createTruck(app, dono.token);

      await criar(
        dono.token,
        documentoValido({
          nome: 'CRLV',
          caminhaoId: caminhao.body.caminhao.id,
        }),
      );
      await criar(dono.token, documentoValido({ nome: 'CNH' }));
      await criar(outro.token, documentoValido({ nome: 'Documento alheio' }));

      const lista = await listar(dono.token);

      expect(lista.body).toHaveLength(2);
      expect(lista.body.map((d) => d.nome).sort()).toEqual(['CNH', 'CRLV']);
      expect(
        lista.body.find((d) => d.nome === 'CRLV').vinculo,
      ).toBe('CAMINHAO');
      expect(lista.body.find((d) => d.nome === 'CNH').vinculo).toBe(
        'MOTORISTA',
      );
    });

    it('deve calcular o status e os dias restantes pela data de vencimento', async () => {
      const dono = await registerAndLogin(app, '200010');

      await criar(dono.token, documentoValido({ nome: 'Valido' }));
      await criar(
        dono.token,
        documentoValido({ nome: 'Vencendo', dataVencimento: emDias(10) }),
      );
      await criar(
        dono.token,
        documentoValido({ nome: 'Expirado', dataVencimento: emDias(-10) }),
      );

      const lista = await listar(dono.token);
      const por = (nome: string) => lista.body.find((d) => d.nome === nome);

      expect(por('Valido').status).toBe('VALIDO');
      expect(por('Vencendo').status).toBe('VENCENDO');
      expect(por('Expirado').status).toBe('EXPIRADO');
      expect(por('Vencendo').diasRestantes).toBe(10);
      expect(por('Expirado').diasRestantes).toBeLessThan(0);
    });
  });

  describe('edicao e exclusao', () => {
    it('deve permitir editar o proprio documento', async () => {
      const dono = await registerAndLogin(app, '200011');
      const criado = await criar(dono.token, documentoValido());

      const resposta = await request(app.getHttpServer())
        .put(`/documentos/${criado.body.documento.id}`)
        .set('Authorization', `Bearer ${dono.token}`)
        .send({ numero: '999' });

      expect(resposta.status).toBe(200);

      const lista = await listar(dono.token);
      expect(lista.body[0].numero).toBe('999');
    });

    it('deve impedir editar documento de outro usuario', async () => {
      const dono = await registerAndLogin(app, '200012');
      const intruso = await registerAndLogin(app, '200013');
      const criado = await criar(dono.token, documentoValido());

      const resposta = await request(app.getHttpServer())
        .put(`/documentos/${criado.body.documento.id}`)
        .set('Authorization', `Bearer ${intruso.token}`)
        .send({ numero: '999' });

      expect(resposta.status).toBe(403);

      const lista = await listar(dono.token);
      expect(lista.body[0].numero).toBe('123456789');
    });

    it('deve excluir o proprio documento', async () => {
      const dono = await registerAndLogin(app, '200014');
      const criado = await criar(dono.token, documentoValido());

      const resposta = await request(app.getHttpServer())
        .delete(`/documentos/${criado.body.documento.id}`)
        .set('Authorization', `Bearer ${dono.token}`);

      expect(resposta.status).toBe(200);
      await expect(listar(dono.token).then((r) => r.body)).resolves.toEqual([]);
    });

    it('deve impedir excluir documento de outro usuario', async () => {
      const dono = await registerAndLogin(app, '200015');
      const intruso = await registerAndLogin(app, '200016');
      const criado = await criar(dono.token, documentoValido());

      const resposta = await request(app.getHttpServer())
        .delete(`/documentos/${criado.body.documento.id}`)
        .set('Authorization', `Bearer ${intruso.token}`);

      expect(resposta.status).toBe(403);
      await expect(
        listar(dono.token).then((r) => r.body.length),
      ).resolves.toBe(1);
    });
  });

  describe('alerta de vencimento', () => {
    it('deve alertar apenas os documentos que vencem dentro da janela configurada', async () => {
      const dono = await registerAndLogin(app, '200017');

      await criar(
        dono.token,
        documentoValido({ nome: 'Dentro', dataVencimento: emDias(10) }),
      );
      await criar(
        dono.token,
        documentoValido({ nome: 'Longe', dataVencimento: emDias(365) }),
      );
      await criar(
        dono.token,
        documentoValido({ nome: 'Expirado', dataVencimento: emDias(-10) }),
      );

      const resposta = await request(app.getHttpServer())
        .get('/documentos/alertas')
        .set('Authorization', `Bearer ${dono.token}`);

      expect(resposta.status).toBe(200);
      expect(resposta.body.alertas.map((a) => a.nome)).toEqual(['Dentro']);
    });
  });
});
