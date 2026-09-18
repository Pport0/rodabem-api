import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ScanService } from '../src/caminhao/scan/scan.service';
import { ScanDocumentoService } from '../src/documento/scan/scan-documento.service';
import { clearDatabase, registerAndLogin } from './e2e.utils';

describe('Scan - seguranca (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const scanCaminhao = { processarDocumento: jest.fn() };
  const scanDocumento = { processarDocumento: jest.fn() };

  const resultado = {
    arquivoUrl: 'https://cdn/arquivo.jpg',
    publicId: 'rodabem/arquivo',
    dadosExtraidos: {},
    camposObrigatoriosFaltando: [],
    confianca: 'baixa',
    mensagem: 'ok',
  };

  const arquivoRecebido = (dublê: typeof scanCaminhao) =>
    dublê.processarDocumento.mock.calls[0]?.[0];

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ScanService)
      .useValue(scanCaminhao)
      .overrideProvider(ScanDocumentoService)
      .useValue(scanDocumento)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    scanCaminhao.processarDocumento.mockResolvedValue(resultado);
    scanDocumento.processarDocumento.mockResolvedValue(resultado);
    await clearDatabase(prisma);
    ({ token } = await registerAndLogin(app, '600001'));
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await app.close();
  });

  describe('controle de acesso', () => {
    it('o scan de caminhao aceita requisicao sem autenticacao', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/caminhao/scan')
        .attach('documento', Buffer.from('imagem'), 'crlv.jpg');

      expect(resposta.status).toBe(201);
      expect(scanCaminhao.processarDocumento).toHaveBeenCalled();
    });

    it('o scan de caminhao processa arquivo de solicitante anonimo', async () => {
      await request(app.getHttpServer())
        .post('/caminhao/scan')
        .attach('documento', Buffer.from('imagem'), 'crlv.jpg')
        .expect(201);

      expect(arquivoRecebido(scanCaminhao)).toBeDefined();
    });

    it('o scan de documento exige autenticacao', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .attach('documento', Buffer.from('imagem'), 'cnh.jpg')
        .expect(401);
    });

    it('o scan de documento recusa token na blacklist', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', Buffer.from('imagem'), 'cnh.jpg')
        .expect(401);
    });

    it('o scan de documento recusa token forjado', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', 'Bearer token-invalido')
        .attach('documento', Buffer.from('imagem'), 'cnh.jpg')
        .expect(401);
    });
  });

  describe('confianca no tipo declarado pelo cliente', () => {
    it('o tipo do arquivo vem do cliente, nao do conteudo', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', Buffer.from('MZ\x90\x00conteudo-executavel'), {
          filename: 'malicioso.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(arquivoRecebido(scanDocumento).mimetype).toBe('image/jpeg');
    });

    it('conteudo de PDF declarado como imagem chega ao servico como imagem', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', Buffer.from('%PDF-1.4'), {
          filename: 'arquivo.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(arquivoRecebido(scanDocumento).mimetype).toBe('image/jpeg');
    });

    it('arquivo vazio e aceito quando o tipo declarado e valido', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', Buffer.alloc(0), {
          filename: 'vazio.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(arquivoRecebido(scanDocumento).size).toBe(0);
    });
  });

  describe('nome do arquivo', () => {
    it('deve repassar nome com travessia de diretorio sem interpretar o caminho', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', Buffer.from('imagem'), {
          filename: '../../../etc/passwd.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      const recebido = arquivoRecebido(scanDocumento);
      expect(typeof recebido.originalname).toBe('string');
      expect(recebido.buffer).toBeDefined();
    });

    it('deve suportar nome de arquivo muito extenso', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', Buffer.from('imagem'), {
          filename: `${'a'.repeat(400)}.jpg`,
          contentType: 'image/jpeg',
        })
        .expect(201);
    });

    it('deve suportar nome com caracteres especiais', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', Buffer.from('imagem'), {
          filename: 'arquivo <script>alert(1)</script>.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(arquivoRecebido(scanDocumento)).toBeDefined();
    });

    it('a aplicacao continua respondendo apos nome malicioso', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', Buffer.from('imagem'), {
          filename: '../../etc/passwd',
          contentType: 'image/jpeg',
        });

      await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
    });
  });

  describe('forma da requisicao', () => {
    it('deve recusar requisicao sem arquivo algum', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('deve ignorar arquivo enviado em campo diferente do esperado', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('outro_campo', Buffer.from('imagem'), 'cnh.jpg')
        .expect(400);

      expect(scanDocumento.processarDocumento).not.toHaveBeenCalled();
    });

    it('deve processar apenas um arquivo quando varios sao enviados no mesmo campo', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', Buffer.from('primeira'), 'a.jpg')
        .attach('documento', Buffer.from('segunda'), 'b.jpg');

      expect(resposta.status).not.toBe(500);
      expect(scanDocumento.processarDocumento.mock.calls.length).toBeLessThanOrEqual(1);
    });

    it('deve ignorar campos extras enviados junto do arquivo', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .field('userId', '99999')
        .field('arquivoUrl', 'https://invasor/arquivo.jpg')
        .attach('documento', Buffer.from('imagem'), 'cnh.jpg')
        .expect(201);

      const recebido = arquivoRecebido(scanDocumento);
      expect(recebido.originalname).toBe('cnh.jpg');
    });

    it('nao deve expor caminho interno na mensagem de erro', async () => {
      scanDocumento.processarDocumento.mockRejectedValue(
        new Error('ENOENT: no such file or directory, open /var/folders/tmp/ocr-1'),
      );

      const resposta = await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', Buffer.from('imagem'), 'cnh.jpg');

      expect(JSON.stringify(resposta.body)).not.toContain('/var/folders');
    });
  });
});
