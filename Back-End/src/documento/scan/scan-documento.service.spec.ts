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

    it('deve recusar arquivo acima de 10MB', async () => {
      await expect(
        service.processarDocumento(arquivo({ size: 10 * 1024 * 1024 + 1 })),
      ).rejects.toThrow('Arquivo muito grande. O tamanho máximo permitido é 10MB.');
    });

    it('deve aceitar arquivo com exatamente 10MB', async () => {
      await expect(
        service.processarDocumento(arquivo({ size: 10 * 1024 * 1024 })),
      ).resolves.toBeDefined();
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

    it('deve enviar buffer, tipo e nome originais', async () => {
      const buffer = Buffer.from('conteudo');

      await processarComTexto(textoCompleto, { buffer });

      expect(cloudinaryService.uploadFile).toHaveBeenCalledWith(
        buffer,
        'image/jpeg',
        'cnh.jpg',
      );
    });
  });

  describe('preparacao da imagem para OCR', () => {
    it('deve gravar a imagem em arquivo temporario quando o envio nao e PDF', async () => {
      const buffer = Buffer.from('conteudo');

      await processarComTexto('', { buffer });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/ocr-\d+\.jpg$/),
        buffer,
      );
    });

    it('deve converter o PDF em imagem antes do OCR', async () => {
      const converter = jest.fn().mockResolvedValue({ path: '/tmp/convertido.jpg' });
      jest.mocked(fromBuffer).mockReturnValue(converter as any);

      await processarComTexto('', { mimetype: 'application/pdf' });

      expect(converter).toHaveBeenCalledWith(1);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('deve reconhecer o texto em portugues', async () => {
      await processarComTexto('');

      expect(Tesseract.createWorker).toHaveBeenCalledWith('por');
    });

    it('deve encerrar o worker apos o reconhecimento', async () => {
      await processarComTexto(textoCompleto);

      expect(worker.terminate).toHaveBeenCalled();
    });

    it('deve remover o arquivo temporario quando ele existe', async () => {
      jest.mocked(fs.existsSync).mockReturnValue(true);

      await processarComTexto(textoCompleto);

      expect(fs.unlinkSync).toHaveBeenCalledWith(
        expect.stringMatching(/ocr-\d+\.jpg$/),
      );
    });

    it('nao deve tentar remover arquivo temporario inexistente', async () => {
      jest.mocked(fs.existsSync).mockReturnValue(false);

      await processarComTexto(textoCompleto);

      expect(fs.unlinkSync).not.toHaveBeenCalled();
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

    it('deve devolver campos vazios quando o OCR nao extrai texto', async () => {
      const { dadosExtraidos } = await processarComTexto('');

      expect(dadosExtraidos).toEqual(semCampos);
    });

    it('deve devolver campos vazios quando o reconhecimento falha', async () => {
      worker.recognize.mockRejectedValue(new Error('tesseract quebrou'));

      const { dadosExtraidos } = await service.processarDocumento(arquivo());

      expect(dadosExtraidos).toEqual(semCampos);
    });

    it('deve encerrar o worker mesmo quando o reconhecimento falha', async () => {
      worker.recognize.mockRejectedValue(new Error('tesseract quebrou'));

      await service.processarDocumento(arquivo());

      expect(worker.terminate).toHaveBeenCalled();
    });

    it('deve tolerar falha ao encerrar o worker apos erro no reconhecimento', async () => {
      worker.recognize.mockRejectedValue(new Error('tesseract quebrou'));
      worker.terminate.mockRejectedValue(new Error('worker travado'));

      await expect(service.processarDocumento(arquivo())).resolves.toBeDefined();
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

  describe('identificacao do tipo de documento', () => {
    it.each([
      ['CARTEIRA NACIONAL DE HABILITACAO', 'CNH'],
      ['DOCUMENTO CNH VALIDO', 'CNH'],
      ['HABILITAÇÃO DEFINITIVA', 'CNH'],
      ['CRLV DIGITAL', 'CRLV'],
      ['LICENCIAMENTO ANUAL', 'CRLV'],
      ['CERTIFICADO DE REGISTRO DE VEICULO', 'CRV'],
      ['CARTEIRA DE IDENTIDADE', 'RG'],
      ['R.G DO PORTADOR', 'RG'],
      ['CADASTRO DE PESSOA FISICA', 'CPF'],
    ])('deve identificar %s como %s', async (texto, esperado) => {
      const { dadosExtraidos } = await processarComTexto(texto);

      expect(dadosExtraidos.nome).toBe(esperado);
    });

    it('deve identificar o tipo independente de caixa', async () => {
      const { dadosExtraidos } = await processarComTexto('carteira nacional');

      expect(dadosExtraidos.nome).toBe('CNH');
    });

    it('deve priorizar CNH sobre os demais tipos', async () => {
      const { dadosExtraidos } = await processarComTexto('CNH E CRLV NO MESMO ARQUIVO');

      expect(dadosExtraidos.nome).toBe('CNH');
    });

    it('deve priorizar CRLV sobre CRV', async () => {
      const { dadosExtraidos } = await processarComTexto('CRLV E CRV');

      expect(dadosExtraidos.nome).toBe('CRLV');
    });

    it('deve devolver nome nulo quando o tipo nao e reconhecido', async () => {
      const { dadosExtraidos } = await processarComTexto('DOCUMENTO QUALQUER');

      expect(dadosExtraidos.nome).toBeNull();
    });
  });

  describe('identificacao do numero do documento', () => {
    it('deve usar sequencia de onze digitos para CNH', async () => {
      const { dadosExtraidos } = await processarComTexto('CNH 12345678901');

      expect(dadosExtraidos.numero).toBe('12345678901');
    });

    it('deve usar o renavam rotulado para CRLV', async () => {
      const { dadosExtraidos } = await processarComTexto('CRLV RENAVAM: 12345678901');

      expect(dadosExtraidos.numero).toBe('12345678901');
    });

    it('deve usar o renavam rotulado para CRV', async () => {
      const { dadosExtraidos } = await processarComTexto(
        'CERTIFICADO DE REGISTRO RENAVAM 98765432109',
      );

      expect(dadosExtraidos.numero).toBe('98765432109');
    });

    it('deve remover espacos internos do renavam', async () => {
      const { dadosExtraidos } = await processarComTexto('CRLV RENAVAM: 123 456 789 01');

      expect(dadosExtraidos.numero).toBe('12345678901');
    });

    it('deve recorrer a sequencia generica quando a CNH nao tem onze digitos', async () => {
      const { dadosExtraidos } = await processarComTexto('CNH 1234567');

      expect(dadosExtraidos.numero).toBe('1234567');
    });

    it('deve recorrer a sequencia generica quando o CRLV nao traz renavam rotulado', async () => {
      const { dadosExtraidos } = await processarComTexto('CRLV 12345678');

      expect(dadosExtraidos.numero).toBe('12345678');
    });

    it('deve usar sequencia generica para documento sem tipo identificado', async () => {
      const { dadosExtraidos } = await processarComTexto('PROTOCOLO 123456789');

      expect(dadosExtraidos.numero).toBe('123456789');
    });

    it('nao deve reconhecer sequencia com menos de sete digitos', async () => {
      const { dadosExtraidos } = await processarComTexto('CODIGO 123456');

      expect(dadosExtraidos.numero).toBeNull();
    });

    it('deve devolver numero nulo quando nao ha digitos suficientes', async () => {
      const { dadosExtraidos } = await processarComTexto('DOCUMENTO SEM NUMERO');

      expect(dadosExtraidos.numero).toBeNull();
    });
  });

  describe('identificacao das datas', () => {
    it('deve reconhecer emissao e validade no layout da CNH', async () => {
      const { dadosExtraidos } = await processarComTexto(
        'CNH 4a DATA EMISSAO 4b VALIDADE 10/01/2020 10/01/2030',
      );

      expect(dadosExtraidos.dataEmissao).toBe('2020-01-10');
      expect(dadosExtraidos.dataVencimento).toBe('2030-01-10');
    });

    it('deve reconhecer emissao rotulada', async () => {
      const { dadosExtraidos } = await processarComTexto('EMISSAO: 15/03/2021');

      expect(dadosExtraidos.dataEmissao).toBe('2021-03-15');
    });

    it('deve reconhecer expedicao como emissao', async () => {
      const { dadosExtraidos } = await processarComTexto('EXPEDIÇÃO 15/03/2021');

      expect(dadosExtraidos.dataEmissao).toBe('2021-03-15');
    });

    it.each(['VALIDADE', 'VENCIMENTO', 'VÁLIDO ATÉ', 'VAL.'])(
      'deve reconhecer vencimento rotulado com %s',
      async (rotulo) => {
        const { dadosExtraidos } = await processarComTexto(`${rotulo}: 20/12/2030`);

        expect(dadosExtraidos.dataVencimento).toBe('2030-12-20');
      },
    );

    it('deve aceitar datas separadas por hifen', async () => {
      const { dadosExtraidos } = await processarComTexto('VALIDADE 20-12-2030');

      expect(dadosExtraidos.dataVencimento).toBe('2030-12-20');
    });

    it('deve usar a segunda data avulsa como emissao quando nao ha rotulo', async () => {
      const { dadosExtraidos } = await processarComTexto(
        '01/01/2020 02/02/2021 03/03/2022',
      );

      expect(dadosExtraidos.dataEmissao).toBe('2021-02-02');
    });

    it('deve usar a terceira data avulsa como vencimento quando nao ha rotulo', async () => {
      const { dadosExtraidos } = await processarComTexto(
        '01/01/2020 02/02/2021 03/03/2022',
      );

      expect(dadosExtraidos.dataVencimento).toBe('2022-03-03');
    });

    it('deve usar a ultima data disponivel como vencimento quando ha menos de tres', async () => {
      const { dadosExtraidos } = await processarComTexto('01/01/2020 02/02/2021');

      expect(dadosExtraidos.dataVencimento).toBe('2021-02-02');
    });

    it('deve ignorar datas anteriores ao ano 2000', async () => {
      const { dadosExtraidos } = await processarComTexto('01/01/1995 02/02/1998');

      expect(dadosExtraidos.dataEmissao).toBeNull();
      expect(dadosExtraidos.dataVencimento).toBeNull();
    });

    it('deve devolver datas nulas quando o texto nao contem datas', async () => {
      const { dadosExtraidos } = await processarComTexto('DOCUMENTO SEM DATAS');

      expect(dadosExtraidos.dataEmissao).toBeNull();
      expect(dadosExtraidos.dataVencimento).toBeNull();
    });

    it('deve preferir o rotulo a posicao da data avulsa', async () => {
      const { dadosExtraidos } = await processarComTexto(
        '01/01/2020 EMISSAO: 05/05/2022 09/09/2023',
      );

      expect(dadosExtraidos.dataEmissao).toBe('2022-05-05');
    });
  });

  describe('campo observacao', () => {
    it('nunca preenche a observacao a partir do texto extraido', async () => {
      const { dadosExtraidos } = await processarComTexto(
        `${textoCompleto} OBSERVACAO: documento em bom estado`,
      );

      expect(dadosExtraidos.observacao).toBeNull();
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

    it('deve apontar apenas os campos que faltaram', async () => {
      const { camposObrigatoriosFaltando } = await processarComTexto('CNH 12345678901');

      expect(camposObrigatoriosFaltando).toEqual(['dataEmissao', 'dataVencimento']);
    });

    it('deve instruir o preenchimento manual dos campos faltantes', async () => {
      const { mensagem } = await processarComTexto('CNH 12345678901');

      expect(mensagem).toBe(
        'Extração concluída. Preencha manualmente: dataEmissao, dataVencimento.',
      );
    });

    it('deve pedir revisao quando nada faltou', async () => {
      const { mensagem } = await processarComTexto(textoCompleto);

      expect(mensagem).toBe(
        'Dados extraídos com sucesso. Revise antes de confirmar o cadastro.',
      );
    });
  });

  describe('nivel de confianca', () => {
    it('deve classificar como alta com quatro ou mais campos reconhecidos', async () => {
      const { confianca } = await processarComTexto(textoCompleto);

      expect(confianca).toBe('alta');
    });

    it('deve classificar como media com dois ou tres campos reconhecidos', async () => {
      const { confianca } = await processarComTexto('CNH 12345678901');

      expect(confianca).toBe('media');
    });

    it('deve classificar como baixa com menos de dois campos reconhecidos', async () => {
      const { confianca } = await processarComTexto('CNH');

      expect(confianca).toBe('baixa');
    });

    it('deve classificar como baixa quando o OCR nao extrai nada', async () => {
      const { confianca } = await processarComTexto('');

      expect(confianca).toBe('baixa');
    });
  });
});
