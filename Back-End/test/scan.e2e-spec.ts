import { BadRequestException, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ScanService } from '../src/caminhao/scan/scan.service';
import { ScanDocumentoService } from '../src/documento/scan/scan-documento.service';
import { clearDatabase, registerAndLogin } from './e2e.utils';

describe('Scan de documentos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let token: string;

  const scanCaminhao = { processarDocumento: jest.fn() };
  const scanDocumento = { processarDocumento: jest.fn() };

  const resultadoCaminhao = {
    arquivoUrl: 'https://cdn/crlv.jpg',
    publicId: 'rodabem/crlv',
    dadosExtraidos: { placa: 'ABC1D23', modelo: 'FH 540', renavam: '12345678901' },
    camposObrigatoriosFaltando: [],
    confianca: 'alta',
    mensagem: 'Dados extraídos com sucesso. Revise antes de confirmar o cadastro.',
  };

  const resultadoDocumento = {
    arquivoUrl: 'https://cdn/cnh.jpg',
    publicId: 'rodabem/cnh',
    dadosExtraidos: { nome: 'CNH', numero: '12345678901' },
    camposObrigatoriosFaltando: ['dataEmissao', 'dataVencimento'],
    confianca: 'media',
    mensagem: 'Extração concluída. Preencha manualmente: dataEmissao, dataVencimento.',
  };

  const imagem = () => Buffer.from('conteudo-da-imagem');

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
    scanCaminhao.processarDocumento.mockResolvedValue(resultadoCaminhao);
    scanDocumento.processarDocumento.mockResolvedValue(resultadoDocumento);
    await clearDatabase(prisma);
    ({ token } = await registerAndLogin(app, '200001'));
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await app.close();
  });

  describe('POST /caminhao/scan', () => {
    it('deve extrair os dados do arquivo enviado', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/caminhao/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', imagem(), 'crlv.jpg')
        .expect(201);

      expect(resposta.body).toEqual(resultadoCaminhao);
    });

    it('deve recusar requisicao sem arquivo', async () => {
      await request(app.getHttpServer())
        .post('/caminhao/scan')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });

    it('deve informar que nenhum arquivo foi enviado', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/caminhao/scan')
        .set('Authorization', `Bearer ${token}`);

      expect(resposta.body.message).toBe('Nenhum arquivo enviado.');
    });

    it('deve recusar arquivo enviado em campo diferente de documento', async () => {
      await request(app.getHttpServer())
        .post('/caminhao/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('arquivo', imagem(), 'crlv.jpg')
        .expect(400);
    });

    it('deve repassar o nome e o tipo originais ao servico', async () => {
      await request(app.getHttpServer())
        .post('/caminhao/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', imagem(), 'crlv.jpg')
        .expect(201);

      expect(scanCaminhao.processarDocumento).toHaveBeenCalledWith(
        expect.objectContaining({
          originalname: 'crlv.jpg',
          mimetype: 'image/jpeg',
        }),
      );
    });

    it('deve devolver 400 quando o servico recusa o formato', async () => {
      scanCaminhao.processarDocumento.mockRejectedValue(
        new BadRequestException(
          'Envie o documento em um formato compatível. Formatos aceitos: PDF, JPG, JPEG, PNG.',
        ),
      );

      const resposta = await request(app.getHttpServer())
        .post('/caminhao/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', imagem(), 'planilha.xls')
        .expect(400);

      expect(resposta.body.message).toContain('Formatos aceitos');
    });

    it('deve devolver 400 quando o servico recusa pelo tamanho', async () => {
      scanCaminhao.processarDocumento.mockRejectedValue(
        new BadRequestException('Arquivo muito grande. O tamanho máximo permitido é 10MB.'),
      );

      const resposta = await request(app.getHttpServer())
        .post('/caminhao/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', imagem(), 'crlv.jpg')
        .expect(400);

      expect(resposta.body.message).toContain('10MB');
    });

    it('aceita requisicao sem autenticacao', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/caminhao/scan')
        .attach('documento', imagem(), 'crlv.jpg');

      expect(resposta.status).not.toBe(401);
      expect(resposta.status).toBe(201);
    });

    it('processa o arquivo de um solicitante nao autenticado', async () => {
      await request(app.getHttpServer())
        .post('/caminhao/scan')
        .attach('documento', imagem(), 'crlv.jpg');

      expect(scanCaminhao.processarDocumento).toHaveBeenCalled();
    });
  });

  describe('POST /documentos/scan', () => {
    it('deve extrair os dados do arquivo enviado', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', imagem(), 'cnh.jpg')
        .expect(201);

      expect(resposta.body).toEqual(resultadoDocumento);
    });

    it('deve recusar requisicao sem autenticacao', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .attach('documento', imagem(), 'cnh.jpg')
        .expect(401);
    });

    it('nao deve acionar o servico quando falta autenticacao', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .attach('documento', imagem(), 'cnh.jpg')
        .expect(401);

      expect(scanDocumento.processarDocumento).not.toHaveBeenCalled();
    });

    it('deve recusar requisicao sem arquivo', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);

      expect(resposta.body.message).toBe('Nenhum arquivo enviado.');
    });

    it('deve recusar arquivo enviado em campo diferente de documento', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('anexo', imagem(), 'cnh.jpg')
        .expect(400);
    });

    it('deve aceitar PDF', async () => {
      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', imagem(), 'cnh.pdf')
        .expect(201);

      expect(scanDocumento.processarDocumento).toHaveBeenCalledWith(
        expect.objectContaining({ mimetype: 'application/pdf' }),
      );
    });

    it('deve devolver os campos obrigatorios que faltaram', async () => {
      const resposta = await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', imagem(), 'cnh.jpg')
        .expect(201);

      expect(resposta.body.camposObrigatoriosFaltando).toEqual([
        'dataEmissao',
        'dataVencimento',
      ]);
    });

    it('deve devolver 400 quando o servico recusa o formato', async () => {
      scanDocumento.processarDocumento.mockRejectedValue(
        new BadRequestException(
          'Envie o documento em um formato compatível. Formatos aceitos: PDF, JPG, JPEG, PNG.',
        ),
      );

      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', imagem(), 'arquivo.txt')
        .expect(400);
    });

    it('deve devolver 400 quando o upload do arquivo falha', async () => {
      scanDocumento.processarDocumento.mockRejectedValue(
        new BadRequestException('Erro ao fazer upload do arquivo.'),
      );

      const resposta = await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', imagem(), 'cnh.jpg')
        .expect(400);

      expect(resposta.body.message).toBe('Erro ao fazer upload do arquivo.');
    });

    it('deve recusar token invalidado por logout', async () => {
      await request(app.getHttpServer())
        .post('/auth/logout')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);

      await request(app.getHttpServer())
        .post('/documentos/scan')
        .set('Authorization', `Bearer ${token}`)
        .attach('documento', imagem(), 'cnh.jpg')
        .expect(401);
    });
  });
});
