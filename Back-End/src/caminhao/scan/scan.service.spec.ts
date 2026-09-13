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

  const arquivo = (sobrescreve: Partial<Express.Multer.File> = {}) =>
    ({
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('imagem'),
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

    it.each(['text/plain', 'image/gif', 'application/msword', 'video/mp4'])(
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

    it('nao deve chamar o OCR quando o formato e invalido', async () => {
      await expect(
        service.processarDocumento(arquivo({ mimetype: 'text/plain' })),
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
    it('deve gravar a imagem em arquivo temporario quando o envio nao e PDF', async () => {
      const buffer = Buffer.from('conteudo');

      await processarComTexto('', { buffer });

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        expect.stringMatching(/ocr-caminhao-\d+\.jpg$/),
        buffer,
      );
    });

    it('deve converter o PDF em imagem antes do OCR', async () => {
      const converter = jest.fn().mockResolvedValue({ path: '/tmp/convertido.jpg' });
      jest.mocked(fromBuffer).mockReturnValue(converter as any);

      await processarComTexto('', { mimetype: 'application/pdf' });

      expect(fromBuffer).toHaveBeenCalled();
      expect(converter).toHaveBeenCalledWith(1);
      expect(fs.writeFileSync).not.toHaveBeenCalled();
    });

    it('deve converter o PDF na resolucao configurada', async () => {
      const converter = jest.fn().mockResolvedValue({ path: '/tmp/convertido.jpg' });
      jest.mocked(fromBuffer).mockReturnValue(converter as any);

      await processarComTexto('', { mimetype: 'application/pdf' });

      expect(jest.mocked(fromBuffer).mock.calls[0][1]).toMatchObject({
        density: 200,
        format: 'jpg',
        width: 2480,
        height: 3508,
      });
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
        expect.stringMatching(/ocr-caminhao-\d+\.jpg$/),
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

    it('deve devolver campos vazios quando o OCR nao extrai texto', async () => {
      const resultado = await processarComTexto('');

      expect(resultado.dadosExtraidos).toEqual(semCampos);
    });

    it('deve devolver campos vazios quando o reconhecimento falha', async () => {
      worker.recognize.mockRejectedValue(new Error('tesseract quebrou'));

      const resultado = await service.processarDocumento(arquivo());

      expect(resultado.dadosExtraidos).toEqual(semCampos);
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
    it('deve enviar o arquivo original apos a extracao', async () => {
      const buffer = Buffer.from('conteudo');

      await processarComTexto(textoCompleto, { buffer });

      expect(cloudinaryService.uploadFile).toHaveBeenCalledWith(
        buffer,
        'image/jpeg',
        'crlv.jpg',
      );
    });

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
    it('deve reconhecer placa no padrao Mercosul', async () => {
      const { dadosExtraidos } = await processarComTexto('PLACA ABC1D23');

      expect(dadosExtraidos.placa).toBe('ABC1D23');
    });

    it('deve reconhecer placa no padrao antigo', async () => {
      const { dadosExtraidos } = await processarComTexto('PLACA ABC1234');

      expect(dadosExtraidos.placa).toBe('ABC1234');
    });

    it('deve remover hifen da placa reconhecida', async () => {
      const { dadosExtraidos } = await processarComTexto('PLACA ABC-1234');

      expect(dadosExtraidos.placa).toBe('ABC1234');
    });

    it('deve remover espaco da placa reconhecida', async () => {
      const { dadosExtraidos } = await processarComTexto('PLACA ABC 1234');

      expect(dadosExtraidos.placa).toBe('ABC1234');
    });

    it('deve devolver placa nula quando o texto nao contem placa', async () => {
      const { dadosExtraidos } = await processarComTexto('DOCUMENTO SEM DADOS');

      expect(dadosExtraidos.placa).toBeNull();
    });
  });

  describe('interpretacao do renavam e do chassi', () => {
    it('deve reconhecer renavam com onze digitos', async () => {
      const { dadosExtraidos } = await processarComTexto('RENAVAM 12345678901');

      expect(dadosExtraidos.renavam).toBe('12345678901');
    });

    it('nao deve reconhecer sequencia com menos de onze digitos como renavam', async () => {
      const { dadosExtraidos } = await processarComTexto('RENAVAM 1234567890');

      expect(dadosExtraidos.renavam).toBeNull();
    });

    it('deve reconhecer chassi com dezessete caracteres', async () => {
      const { dadosExtraidos } = await processarComTexto('CHASSI 9BWZZZ377VT004251');

      expect(dadosExtraidos.chassi).toBe('9BWZZZ377VT004251');
    });

    it('deve devolver chassi nulo quando o texto nao contem chassi', async () => {
      const { dadosExtraidos } = await processarComTexto('PLACA ABC1D23');

      expect(dadosExtraidos.chassi).toBeNull();
    });
  });

  describe('interpretacao do ano de fabricacao', () => {
    it('deve usar o primeiro ano quando ha par de anos precedido por rotulos', async () => {
      const { dadosExtraidos } = await processarComTexto(
        'ANO FABRICACAO ANO MODELO 2020 2021',
      );

      expect(dadosExtraidos.anoFabricacao).toBe(2020);
    });

    it('deve usar o primeiro ano quando ha par de anos sem rotulo', async () => {
      const { dadosExtraidos } = await processarComTexto('2018 2019');

      expect(dadosExtraidos.anoFabricacao).toBe(2018);
    });

    it('deve usar o ano isolado quando nao ha par de anos', async () => {
      const { dadosExtraidos } = await processarComTexto('FABRICADO EM 2015');

      expect(dadosExtraidos.anoFabricacao).toBe(2015);
    });

    it('deve devolver ano nulo quando o texto nao contem ano', async () => {
      const { dadosExtraidos } = await processarComTexto('SEM DATA AQUI');

      expect(dadosExtraidos.anoFabricacao).toBeNull();
    });
  });

  describe('interpretacao de marca e modelo', () => {
    it.each(['VOLVO', 'SCANIA', 'MERCEDES', 'DAF', 'IVECO', 'MAN', 'FORD', 'VOLKSWAGEN'])(
      'deve reconhecer a marca %s',
      async (marca) => {
        const { dadosExtraidos } = await processarComTexto(`VEICULO ${marca} PESADO`);

        expect(dadosExtraidos.marca).toBe(marca);
      },
    );

    it('deve reconhecer a marca independente de caixa', async () => {
      const { dadosExtraidos } = await processarComTexto('veiculo volvo pesado');

      expect(dadosExtraidos.marca).toBe('VOLVO');
    });

    it('deve extrair o modelo do padrao marca barra modelo', async () => {
      const { dadosExtraidos } = await processarComTexto('VOLVO/FH 540');

      expect(dadosExtraidos.modelo).toBe('FH 540');
    });

    it('deve usar a marca do padrao com barra quando ela nao esta na lista conhecida', async () => {
      const { dadosExtraidos } = await processarComTexto('AGRALE/MA 150');

      expect(dadosExtraidos.marca).toBe('AGRALE');
      expect(dadosExtraidos.modelo).toBe('MA 150');
    });

    it('deve preservar a marca da lista quando o padrao com barra traz outra', async () => {
      const { dadosExtraidos } = await processarComTexto('SCANIA MARCA/R 450');

      expect(dadosExtraidos.marca).toBe('SCANIA');
      expect(dadosExtraidos.modelo).toBe('R 450');
    });

    it('deve devolver marca e modelo nulos quando nada e reconhecido', async () => {
      const { dadosExtraidos } = await processarComTexto('TEXTO SEM VEICULO');

      expect(dadosExtraidos.marca).toBeNull();
      expect(dadosExtraidos.modelo).toBeNull();
    });
  });

  describe('interpretacao de cor e especie', () => {
    it.each(['BRANCA', 'PRETA', 'CINZA', 'AZUL', 'VERMELHA', 'PRATA'])(
      'deve reconhecer a cor %s',
      async (cor) => {
        const { dadosExtraidos } = await processarComTexto(`COR ${cor}`);

        expect(dadosExtraidos.cor).toBe(cor);
      },
    );

    it('deve normalizar a cor para caixa alta', async () => {
      const { dadosExtraidos } = await processarComTexto('cor branca');

      expect(dadosExtraidos.cor).toBe('BRANCA');
    });

    it('deve reconhecer especie composta', async () => {
      const { dadosExtraidos } = await processarComTexto('ESPECIE CAMINHAO TRATOR');

      expect(dadosExtraidos.especieTipo).toBe('CAMINHAO TRATOR');
    });

    it('deve reduzir espacos repetidos na especie', async () => {
      const { dadosExtraidos } = await processarComTexto('ESPECIE CAMINHAO    TRATOR');

      expect(dadosExtraidos.especieTipo).toBe('CAMINHAO TRATOR');
    });

    it('deve reconhecer semi-reboque', async () => {
      const { dadosExtraidos } = await processarComTexto('TIPO SEMI-REBOQUE');

      expect(dadosExtraidos.especieTipo).toBe('SEMI-REBOQUE');
    });

    it('deve devolver cor e especie nulas quando nao reconhecidas', async () => {
      const { dadosExtraidos } = await processarComTexto('DOCUMENTO GENERICO');

      expect(dadosExtraidos.cor).toBeNull();
      expect(dadosExtraidos.especieTipo).toBeNull();
    });
  });

  describe('campo crv', () => {
    it('nunca preenche o crv, mesmo com o texto mencionando o documento', async () => {
      const { dadosExtraidos } = await processarComTexto('CRV 123456789');

      expect(dadosExtraidos.crv).toBeNull();
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

    it('deve apontar apenas o campo que faltou', async () => {
      const { camposObrigatoriosFaltando } = await processarComTexto(
        'PLACA ABC1D23 VOLVO/FH 540',
      );

      expect(camposObrigatoriosFaltando).toEqual(['renavam']);
    });

    it('deve instruir o preenchimento manual dos campos faltantes', async () => {
      const { mensagem } = await processarComTexto('PLACA ABC1D23 VOLVO/FH 540');

      expect(mensagem).toBe('Extração concluída. Preencha manualmente: renavam.');
    });

    it('deve pedir revisao quando nada faltou', async () => {
      const { mensagem } = await processarComTexto(textoCompleto);

      expect(mensagem).toBe(
        'Dados extraídos com sucesso. Revise antes de confirmar o cadastro.',
      );
    });
  });

  describe('nivel de confianca', () => {
    it('deve classificar como alta com seis ou mais campos reconhecidos', async () => {
      const { confianca } = await processarComTexto(textoCompleto);

      expect(confianca).toBe('alta');
    });

    it('deve classificar como media entre tres e cinco campos reconhecidos', async () => {
      const { confianca } = await processarComTexto(
        'PLACA ABC1D23 RENAVAM 12345678901 COR BRANCA',
      );

      expect(confianca).toBe('media');
    });

    it('deve classificar como baixa com menos de tres campos reconhecidos', async () => {
      const { confianca } = await processarComTexto('PLACA ABC1D23');

      expect(confianca).toBe('baixa');
    });

    it('deve classificar como baixa quando o OCR nao extrai nada', async () => {
      const { confianca } = await processarComTexto('');

      expect(confianca).toBe('baixa');
    });
  });
});
