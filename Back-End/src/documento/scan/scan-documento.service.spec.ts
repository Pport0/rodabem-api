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

/**
 * Criterio desta suite.
 *
 * A RNE-06 promete tres coisas: que a extracao seja TENTADA, que o resultado va PARA REVISAO do usuario, e que a falha NAO IMPECA o cadastro. Nada alem disso.
 *
 * Ficou um unico caso de extracao, 'deve extrair os dados de uma CNH tipica'. Ele nao esta aqui para fixar formato: esta porque sem ele nada mais prova que a extracao funciona, ja que o e2e de scan dubla este servico.
 */
describe('ScanDocumentoService', () => {
  let service: ScanDocumentoService;
  let silenciarLog: jest.SpyInstance;
  let silenciarErro: jest.SpyInstance;

  const configService = { get: jest.fn() };
  const cloudinaryService = { uploadFile: jest.fn(), deleteFile: jest.fn() };

  const worker = { recognize: jest.fn(), terminate: jest.fn() };

  const arquivo = (sobrescreve: Partial<Express.Multer.File> = {}) =>
    ({
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('imagem'),
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
    it.each(['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'])(
      'deve aceitar o formato %s',
      async (mimetype) => {
        if (mimetype === 'application/pdf') {
          jest
            .mocked(fromBuffer)
            .mockReturnValue(jest.fn().mockResolvedValue({ path: '/tmp/x.jpg' }) as any);
        }

        await expect(
          service.processarDocumento(arquivo({ mimetype })),
        ).resolves.toBeDefined();
      },
    );

    it.each(['text/plain', 'image/gif', 'application/zip'])(
      'deve recusar o formato %s',
      async (mimetype) => {
        await expect(
          service.processarDocumento(arquivo({ mimetype })),
        ).rejects.toThrow(BadRequestException);
      },
    );

    it('deve informar os formatos aceitos ao recusar', async () => {
      await expect(
        service.processarDocumento(arquivo({ mimetype: 'text/plain' })),
      ).rejects.toThrow('Formatos aceitos: PDF, JPG, JPEG, PNG.');
    });

    // RNE-06: "Validar formato e tamanho maximo de 12MB".
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
        service.processarDocumento(arquivo({ mimetype: 'text/plain' })),
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
    // Unico caso de extracao que sobrou. Nao esta aqui para fixar formato: esta porque sem ele nada mais prova que a
    // extracao funciona — o e2e de scan dubla este servico.
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
