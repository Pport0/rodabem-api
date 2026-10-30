import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getStorageToken } from '@nestjs/throttler';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { HodometroScanService } from '../src/abastecimento/scan/hodometro-scan.service';
import {
  clearDatabase,
  registerAndLogin,
  semLimiteDeRequisicoes,
} from './e2e.utils';

describe('Scan de hodometro (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const scanHodometro = { processarHodometro: jest.fn() };

  const resultadoLido = {
    quilometragem: 182350,
    confianca: 'media',
    mensagem: 'Quilometragem extraída. Revise antes de confirmar.',
  };

  const imagem = () => Buffer.from('conteudo-da-imagem');

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(getStorageToken())
      .useValue(semLimiteDeRequisicoes)
      .overrideProvider(HodometroScanService)
      .useValue(scanHodometro)
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
    jest.clearAllMocks();
    scanHodometro.processarHodometro.mockResolvedValue(resultadoLido);
    await clearDatabase(prisma);
    ({ token } = await registerAndLogin(app, '210001'));
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await prisma.$disconnect();
    await app.close();
  });

  const enviar = (campo = 'imagem', nome = 'hodometro.jpg') =>
    request(app.getHttpServer())
      .post('/abastecimentos/scan')
      .set('Authorization', `Bearer ${token}`)
      .attach(campo, imagem(), nome);

  describe('POST /abastecimentos/scan', () => {
    it('deve devolver a leitura do arquivo enviado', async () => {
      const resposta = await enviar().expect(201);

      expect(resposta.body).toEqual(resultadoLido);
    });

    it('deve recusar requisicao sem arquivo', async () => {
      await request(app.getHttpServer())
        .post('/abastecimentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('deve informar que nenhuma imagem foi enviada', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/abastecimentos/scan')
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.body.message).toBe('Nenhuma imagem enviada.');
    });

    it('deve recusar arquivo enviado em campo diferente de imagem', async () => {
      await enviar('documento').expect(400);
    });

    it('deve repassar o nome e o tipo originais ao servico', async () => {
      await enviar('imagem', 'odometro.jpg').expect(201);

      expect(scanHodometro.processarHodometro).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'odometro.jpg',
          mimetype: 'image/jpeg',
        }),
      );
    });

    it('nao deve chamar o servico quando nao ha arquivo', async () => {
      await request(app.getHttpServer())
        .post('/abastecimentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(scanHodometro.processarHodometro).not.toHaveBeenCalled();
    });
  });

  describe('recusa do servico chega ao cliente', () => {
    it('deve devolver 400 quando o servico recusa o formato', async () => {
      scanHodometro.processarHodometro.mockRejectedValue(
        new BadRequestException(
          'Envie a imagem em um formato compatível. Formatos aceitos: JPG, JPEG, PNG, PDF.',
        ),
      );

      const resposta = await enviar().expect(400);

      expect(resposta.body.message).toMatch(/JPG, JPEG, PNG, PDF/);
    });

    it('deve devolver 400 quando o servico recusa pelo tamanho', async () => {
      scanHodometro.processarHodometro.mockRejectedValue(
        new BadRequestException(
          'Arquivo muito grande. O tamanho máximo permitido é 12MB.',
        ),
      );

      const resposta = await enviar().expect(400);

      expect(resposta.body.message).toMatch(/12MB/);
    });

    it('deve entregar a leitura vazia sem transformar em erro', async () => {
      scanHodometro.processarHodometro.mockResolvedValue({
        quilometragem: null,
        confianca: 'baixa',
        mensagem: 'Não foi possível extrair a quilometragem. Preencha manualmente.',
      });

      const resposta = await enviar().expect(201);

      expect(resposta.body.quilometragem).toBeNull();
      expect(resposta.body.mensagem).toMatch(/manual/i);
    });
  });

  describe('autenticacao', () => {
    it('deve exigir autenticacao, como os demais scans', async () => {
      await request(app.getHttpServer())
        .post('/abastecimentos/scan')
        .attach('imagem', imagem(), 'hodometro.jpg')
        .expect(401);
    });

    it('nao deve processar arquivo de solicitante anonimo', async () => {
      await request(app.getHttpServer())
        .post('/abastecimentos/scan')
        .attach('imagem', imagem(), 'hodometro.jpg')
        .expect(401);

      expect(scanHodometro.processarHodometro).not.toHaveBeenCalled();
    });

    it('deve recusar token invalidado por logout', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      await enviar().expect(401);
    });
  });
});
