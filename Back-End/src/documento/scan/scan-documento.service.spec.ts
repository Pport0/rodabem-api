import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { fromBuffer } from 'pdf2pic';
import * as Tesseract from 'tesseract.js';
import { ScanDocumentoService } from './scan-documento.service';

jest.mock('tesseract.js', () => ({ createWorker: jest.fn() }));
jest.mock('pdf2pic', () => ({ fromBuffer: jest.fn() }));
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  statSync: jest.fn(() => ({ size: 1024 })),
  existsSync: jest.fn(() => false),
  unlinkSync: jest.fn(),
}));

describe('ScanDocumentoService', () => {
  let service: ScanDocumentoService;
  let silenciarLog: jest.SpyInstance;
  let silenciarErro: jest.SpyInstance;

  const configService = { get: jest.fn() };
  const cloudinaryService = { uploadFile: jest.fn(), deleteFile: jest.fn() };

  const worker = { recognize: jest.fn(), terminate: jest.fn() };

  const CONTEUDO = {
    jpeg: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
    png: Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52,
    ]),
    pdf: Buffer.from('%PDF-1.4\n%\xe2\xe3\xcf\xd3\n', 'binary'),
    gif: Buffer.from('GIF89a'),
    texto: Buffer.from('apenas texto, nenhum formato reconhecivel'),
  };

  const arquivo = (sobrescreve: Partial<Express.Multer.File> = {}) =>
    ({
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: CONTEUDO.jpeg,
      originalname: 'cnh.jpg',
      ...sobrescreve,
    }) as Express.Multer.File;

  const processarComTexto = async (
    texto: string,
    sobrescreve: Partial<Express.Multer.File> = {},
  ) => {
    worker.recognize.mockResolvedValue({ data: { text: texto } });
    return service.processarDocumento(arquivo(sobrescreve));
  };

  const textoCompleto =
    'CARTEIRA NACIONAL DE HABILITACAO 12345678901 ' +
    'EMISSAO: 10/01/2020 VALIDADE: 10/01/2030';

  beforeAll(() => {
    silenciarLog = jest.spyOn(console, 'log').mockImplementation(() => {});
    silenciarErro = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => {
    silenciarLog.mockRestore();
    silenciarErro.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(fs.statSync).mockReturnValue({ size: 1024 } as any);
    jest.mocked(fs.existsSync).mockReturnValue(false);
    jest.mocked(Tesseract.createWorker).mockResolvedValue(worker as any);
    worker.terminate.mockResolvedValue(undefined);
    worker.recognize.mockResolvedValue({ data: { text: '' } });
    cloudinaryService.uploadFile.mockResolvedValue({
      url: 'https://cdn/cnh.jpg',
      publicId: 'rodabem/cnh',
    });
    service = new ScanDocumentoService(
      configService as any,
      cloudinaryService as any,
    );
  });

  describe('validacao do arquivo', () => {
    it.each([
      ['JPEG', CONTEUDO.jpeg],
      ['PNG', CONTEUDO.png],
      ['PDF', CONTEUDO.pdf],
    ])('deve aceitar conteudo %s', async (_, buffer) => {
      jest
        .mocked(fromBuffer)
        .mockReturnValue(jest.fn().mockResolvedValue({ path: '/tmp/x.jpg' }) as any);

      await expect(service.processarDocumento(arquivo({ buffer }))).resolves.toBeDefined();
    });

    it.each([
      ['GIF', CONTEUDO.gif],
      ['texto sem formato reconhecivel', CONTEUDO.texto],
    ])('deve recusar conteudo %s', async (_, buffer) => {
      await expect(service.processarDocumento(arquivo({ buffer }))).rejects.toThrow(
        BadRequestException,
      );
    });

    it('deve decidir pelo conteudo, nao pelo tipo declarado pelo cliente', async () => {
      await expect(
        service.processarDocumento(
          arquivo({ mimetype: 'image/jpeg', buffer: CONTEUDO.gif }),
        ),
      ).rejects.toThrow(BadRequestException);

      await expect(
        service.processarDocumento(
          arquivo({ mimetype: 'application/octet-stream', buffer: CONTEUDO.png }),
        ),
      ).resolves.toBeDefined();
    });

    it('deve informar os formatos aceitos ao recusar', async () => {
      await expect(
        service.processarDocumento(arquivo({ buffer: CONTEUDO.texto })),
      ).rejects.toThrow('Formatos aceitos: PDF, JPG, JPEG, PNG.');
    });

    it('deve aplicar o limite de tamanho de 12MB', async () => {
      const MB = 1024 * 1024;

      await expect(
        service.processarDocumento(arquivo({ size: 12 * MB })),
      ).resolves.toBeDefined();

      await expect(
        service.processarDocumento(arquivo({ size: 12 * MB + 1 })),
      ).rejects.toThrow(BadRequestException);
    });

    it('nao deve enviar ao cloudinary quando o formato e invalido', async () => {
      await expect(
        service.processarDocumento(arquivo({ buffer: CONTEUDO.texto })),
      ).rejects.toThrow(BadRequestException);

      expect(cloudinaryService.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('ordem entre upload e extracao', () => {
    it('deve enviar o arquivo antes de executar o OCR', async () => {
      const ordem: string[] = [];
      cloudinaryService.uploadFile.mockImplementation(async () => {
        ordem.push('upload');
        return { url: 'u', publicId: 'p' };
      });
      jest.mocked(Tesseract.createWorker).mockImplementation(async () => {
        ordem.push('ocr');
        return worker as any;
      });

      await processarComTexto(textoCompleto);

      expect(ordem).toEqual(['upload', 'ocr']);
    });

    it('nao deve executar o OCR quando o upload falha', async () => {
      cloudinaryService.uploadFile.mockRejectedValue(
        new BadRequestException('Erro ao fazer upload do arquivo.'),
      );

      await expect(processarComTexto(textoCompleto)).rejects.toThrow(
        'Erro ao fazer upload do arquivo.',
      );
      expect(Tesseract.createWorker).not.toHaveBeenCalled();
    });

  });

  describe('preparacao da imagem para OCR', () => {

    it('deve remover o arquivo temporario quando ele existe', async () => {
      jest.mocked(fs.existsSync).mockReturnValue(true);

      await processarComTexto(textoCompleto);

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        expect.stringMatching(/ocr-\d+\.jpg$/),
      );
    });

  });

  describe('falhas durante o OCR', () => {
    const semCampos = {
      nome: null,
      numero: null,
      dataEmissao: null,
      dataVencimento: null,
      observacao: null,
    };

    it('deve devolver campos vazios quando o reconhecimento falha', async () => {
      worker.recognize.mockRejectedValue(new Error('tesseract quebrou'));

      const { dadosExtraidos } = await service.processarDocumento(arquivo());

      expect(dadosExtraidos).toEqual(semCampos);
    });

    it('deve devolver campos vazios quando a criacao do worker falha', async () => {
      jest.mocked(Tesseract.createWorker).mockRejectedValue(new Error('sem memoria'));

      const { dadosExtraidos } = await service.processarDocumento(arquivo());

      expect(dadosExtraidos).toEqual(semCampos);
    });

    it('deve devolver campos vazios quando a conversao do PDF falha', async () => {
      jest
        .mocked(fromBuffer)
        .mockReturnValue(jest.fn().mockRejectedValue(new Error('pdf corrompido')) as any);

      const { dadosExtraidos } = await service.processarDocumento(
        arquivo({ mimetype: 'application/pdf' }),
      );

      expect(dadosExtraidos).toEqual(semCampos);
    });

    it('deve manter a url do arquivo mesmo quando o OCR falha', async () => {
      worker.recognize.mockRejectedValue(new Error('tesseract quebrou'));

      const resultado = await service.processarDocumento(arquivo());

      expect(resultado.arquivoUrl).toBe('https://cdn/cnh.jpg');
    });
  });

  describe('identificacao das datas', () => {
    it('deve extrair os dados de uma CNH tipica', async () => {
      const { dadosExtraidos } = await processarComTexto(
        'CARTEIRA NACIONAL DE HABILITACAO 12345678901 4a DATA EMISSAO 4b VALIDADE 10/01/2020 10/01/2030',
      );

      expect(dadosExtraidos.nome).toBe('CNH');
      expect(dadosExtraidos.numero).toBe('12345678901');
      expect(dadosExtraidos.dataEmissao).toBe('2020-01-10');
      expect(dadosExtraidos.dataVencimento).toBe('2030-01-10');
    });

  });

  describe('campos obrigatorios ausentes', () => {
    it('deve apontar os quatro campos quando nada e reconhecido', async () => {
      const { camposObrigatoriosFaltando } = await processarComTexto('SEM DADOS');

      expect(camposObrigatoriosFaltando).toEqual([
        'nome',
        'numero',
        'dataEmissao',
        'dataVencimento',
      ]);
    });

    it('nao deve apontar campo algum quando todos sao reconhecidos', async () => {
      const { camposObrigatoriosFaltando } = await processarComTexto(textoCompleto);

      expect(camposObrigatoriosFaltando).toEqual([]);
    });

  });

});
