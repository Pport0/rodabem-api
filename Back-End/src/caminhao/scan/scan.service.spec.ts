import { BadRequestException } from '@nestjs/common';
import * as fs from 'fs';
import { fromBuffer } from 'pdf2pic';
import * as Tesseract from 'tesseract.js';
import { ScanService } from './scan.service';

jest.mock('tesseract.js', () => ({ createWorker: jest.fn() }));
jest.mock('pdf2pic', () => ({ fromBuffer: jest.fn() }));
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  statSync: jest.fn(() => ({ size: 1024 })),
  existsSync: jest.fn(() => false),
  unlinkSync: jest.fn(),
}));

describe('ScanService', () => {
  let service: ScanService;
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
      originalname: 'crlv.jpg',
      ...sobrescreve,
    }) as Express.Multer.File;

  const ocrRetorna = (texto: string) => {
    worker.recognize.mockResolvedValue({ data: { text: texto } });
  };

  const processarComTexto = async (
    texto: string,
    sobrescreve: Partial<Express.Multer.File> = {},
  ) => {
    ocrRetorna(texto);
    return service.processarDocumento(arquivo(sobrescreve));
  };

  const textoCompleto =
    'PLACA ABC1D23 RENAVAM 12345678901 CHASSI 9BWZZZ377VT004251 ' +
    'VOLVO/FH 540 COR BRANCA CAMINHAO TRATOR ANO 2020 2021';

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
    ocrRetorna('');
    cloudinaryService.uploadFile.mockResolvedValue({
      url: 'https://cdn/crlv.jpg',
      publicId: 'rodabem/crlv',
    });
    service = new ScanService(configService as any, cloudinaryService as any);
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

    it('nao deve chamar o OCR quando o formato e invalido', async () => {
      await expect(
        service.processarDocumento(arquivo({ buffer: CONTEUDO.texto })),
      ).rejects.toThrow(BadRequestException);

      expect(Tesseract.createWorker).not.toHaveBeenCalled();
    });

    it('nao deve enviar o arquivo ao cloudinary quando excede o tamanho', async () => {
      await expect(
        service.processarDocumento(arquivo({ size: 20 * 1024 * 1024 })),
      ).rejects.toThrow(BadRequestException);

      expect(cloudinaryService.uploadFile).not.toHaveBeenCalled();
    });
  });

  describe('preparacao da imagem para OCR', () => {

    it('deve remover o arquivo temporario quando ele existe', async () => {
      jest.mocked(fs.existsSync).mockReturnValue(true);

      await processarComTexto(textoCompleto);

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        expect.stringMatching(/ocr-caminhao-\d+\.jpg$/),
      );
    });

  });

  describe('falhas durante o OCR', () => {
    const semCampos = {
      placa: null,
      modelo: null,
      renavam: null,
      crv: null,
      marca: null,
      especieTipo: null,
      chassi: null,
      cor: null,
      anoFabricacao: null,
    };

    it('deve devolver campos vazios quando o reconhecimento falha', async () => {
      worker.recognize.mockRejectedValue(new Error('tesseract quebrou'));

      const resultado = await service.processarDocumento(arquivo());

      expect(resultado.dadosExtraidos).toEqual(semCampos);
    });

    it('deve devolver campos vazios quando a criacao do worker falha', async () => {
      jest
        .mocked(Tesseract.createWorker)
        .mockRejectedValue(new Error('sem memoria'));

      const resultado = await service.processarDocumento(arquivo());

      expect(resultado.dadosExtraidos).toEqual(semCampos);
    });

    it('deve devolver campos vazios quando a conversao do PDF falha', async () => {
      jest
        .mocked(fromBuffer)
        .mockReturnValue(jest.fn().mockRejectedValue(new Error('pdf corrompido')) as any);

      const resultado = await service.processarDocumento(
        arquivo({ mimetype: 'application/pdf' }),
      );

      expect(resultado.dadosExtraidos).toEqual(semCampos);
    });

    it('nao deve interromper o cadastro quando o OCR falha', async () => {
      worker.recognize.mockRejectedValue(new Error('tesseract quebrou'));

      const resultado = await service.processarDocumento(arquivo());

      expect(resultado.arquivoUrl).toBe('https://cdn/crlv.jpg');
    });

    it('deve remover o arquivo temporario mesmo quando o OCR falha', async () => {
      jest.mocked(fs.existsSync).mockReturnValue(true);
      worker.recognize.mockRejectedValue(new Error('tesseract quebrou'));

      await service.processarDocumento(arquivo());

      expect(fs.unlinkSync).toHaveBeenCalled();
    });
  });

  describe('envio para o cloudinary', () => {

    it('deve devolver a url e o identificador publico recebidos', async () => {
      const resultado = await processarComTexto(textoCompleto);

      expect(resultado.arquivoUrl).toBe('https://cdn/crlv.jpg');
      expect(resultado.publicId).toBe('rodabem/crlv');
    });

    it('deve propagar falha no envio do arquivo', async () => {
      cloudinaryService.uploadFile.mockRejectedValue(
        new BadRequestException('Erro ao fazer upload do arquivo.'),
      );

      await expect(processarComTexto(textoCompleto)).rejects.toThrow(
        'Erro ao fazer upload do arquivo.',
      );
    });
  });

  describe('interpretacao da placa', () => {
    it('deve extrair os dados de um CRLV tipico', async () => {
      const { dadosExtraidos } = await processarComTexto('PLACA ABC1D23');

      expect(dadosExtraidos.placa).toBe('ABC1D23');
    });

  });

  describe('campos obrigatorios ausentes', () => {
    it('deve apontar placa, modelo e renavam quando nada e reconhecido', async () => {
      const { camposObrigatoriosFaltando } = await processarComTexto('SEM DADOS');

      expect(camposObrigatoriosFaltando).toEqual(['placa', 'modelo', 'renavam']);
    });

    it('nao deve apontar campo algum quando os tres sao reconhecidos', async () => {
      const { camposObrigatoriosFaltando } = await processarComTexto(textoCompleto);

      expect(camposObrigatoriosFaltando).toEqual([]);
    });
  });

  describe('confianca do reconhecimento', () => {

    it('deve reportar confianca alta quando reconhece o documento inteiro', async () => {
      const { confianca } = await processarComTexto(textoCompleto);

      expect(confianca).toBe('alta');
    });

    it('deve reportar confianca media quando reconhece parte dos campos', async () => {
      const { confianca } = await processarComTexto(
        'PLACA ABC1D23 CHASSI 9BWZZZ377VT004251 COR BRANCA',
      );

      expect(confianca).toBe('media');
    });

    it('deve reportar confianca baixa quando quase nada e reconhecido', async () => {
      const { confianca } = await processarComTexto('DOCUMENTO ILEGIVEL');

      expect(confianca).toBe('baixa');
    });
  });

});
