import { BadRequestException } from '@nestjs/common';
import * as Tesseract from 'tesseract.js';
import { HodometroScanService } from './hodometro-scan.service';

jest.mock('tesseract.js', () => ({ createWorker: jest.fn() }));
jest.mock('pdf2pic', () => ({ fromBuffer: jest.fn() }));
jest.mock('fs', () => ({
  writeFileSync: jest.fn(),
  existsSync: jest.fn(() => false),
  unlinkSync: jest.fn(),
}));

describe('HodometroScanService', () => {
  let service: HodometroScanService;
  let silenciarLog: jest.SpyInstance;
  let silenciarErro: jest.SpyInstance;

  const worker = { recognize: jest.fn(), terminate: jest.fn() };

  const CONTEUDO = {
    jpeg: Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]),
    png: Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44,
      0x52,
    ]),
    gif: Buffer.from('GIF89a'),
    texto: Buffer.from('apenas texto, nenhum formato reconhecivel'),
  };

  const arquivo = (sobrescreve: Record<string, unknown> = {}) => ({
    mimetype: 'image/jpeg',
    size: 1024,
    buffer: CONTEUDO.jpeg,
    originalname: 'hodometro.jpg',
    ...sobrescreve,
  });

  const lerHodometro = async (texto: string, sobrescreve: Record<string, unknown> = {}) => {
    worker.recognize.mockResolvedValue({ data: { text: texto } });
    return service.processarHodometro(arquivo(sobrescreve));
  };

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
    worker.terminate.mockResolvedValue(undefined);
    jest.mocked(Tesseract.createWorker).mockResolvedValue(worker as never);
    service = new HodometroScanService();
  });

  describe('validacao do arquivo', () => {
    it('deve recusar arquivo vazio', async () => {
      await expect(
        service.processarHodometro(arquivo({ buffer: Buffer.alloc(0), size: 0 })),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve recusar formato que nao e imagem nem pdf', async () => {
      await expect(
        service.processarHodometro(arquivo({ buffer: CONTEUDO.gif })),
      ).rejects.toThrow(BadRequestException);
    });

    it('nao deve confiar no tipo declarado pelo cliente', async () => {
      await expect(
        service.processarHodometro(
          arquivo({ buffer: CONTEUDO.texto, mimetype: 'image/png' }),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve informar os formatos aceitos ao recusar', async () => {
      await expect(
        service.processarHodometro(arquivo({ buffer: CONTEUDO.gif })),
      ).rejects.toThrow(/JPG, JPEG, PNG, PDF/);
    });

    it('deve aplicar o limite de tamanho de 12MB', async () => {
      const MB = 1024 * 1024;
      worker.recognize.mockResolvedValue({ data: { text: '182350' } });

      await expect(
        service.processarHodometro(arquivo({ size: 12 * MB })),
      ).resolves.toBeDefined();

      await expect(
        service.processarHodometro(arquivo({ size: 12 * MB + 1 })),
      ).rejects.toThrow(BadRequestException);
    });

    it('nao deve chamar o OCR quando o arquivo e recusado', async () => {
      await expect(
        service.processarHodometro(arquivo({ buffer: CONTEUDO.gif })),
      ).rejects.toThrow(BadRequestException);

      expect(Tesseract.createWorker).not.toHaveBeenCalled();
    });

    it('deve aceitar png, nao so jpeg', async () => {
      const resultado = await lerHodometro('182350', { buffer: CONTEUDO.png });

      expect(resultado.quilometragem).toBe(182350);
    });
  });

  describe('o que o motorista recebe', () => {
    it('deve devolver a quilometragem lida para revisao', async () => {
      const resultado = await lerHodometro('ODOMETRO 182350 KM');

      expect(resultado.quilometragem).toBe(182350);
      expect(resultado.mensagem).toMatch(/revise/i);
    });

    it('deve pedir preenchimento manual quando nao reconhece numero', async () => {
      const resultado = await lerHodometro('imagem sem nenhum numero legivel');

      expect(resultado.quilometragem).toBeNull();
      expect(resultado.mensagem).toMatch(/manual/i);
    });

    it('deve sinalizar confianca baixa quando nao extraiu nada', async () => {
      const comLeitura = await lerHodometro('182350');
      const semLeitura = await lerHodometro('nada aqui');

      expect(comLeitura.confianca).not.toBe(semLeitura.confianca);
      expect(semLeitura.confianca).toBe('baixa');
    });
  });

  describe('falha do OCR nao pode bloquear o cadastro', () => {
    it('nao deve lancar quando o OCR falha', async () => {
      worker.recognize.mockRejectedValue(new Error('tesseract quebrou'));

      const resultado = await service.processarHodometro(arquivo());

      expect(resultado.quilometragem).toBeNull();
      expect(resultado.mensagem).toMatch(/manual/i);
    });

    it('nao deve lancar quando o motor do OCR nem inicia', async () => {
      jest.mocked(Tesseract.createWorker).mockRejectedValue(
        new Error('sem memoria') as never,
      );

      const resultado = await service.processarHodometro(arquivo());

      expect(resultado.quilometragem).toBeNull();
    });

    it('deve encerrar o worker mesmo quando o OCR falha', async () => {
      worker.recognize.mockRejectedValue(new Error('tesseract quebrou'));

      await service.processarHodometro(arquivo());

      expect(worker.terminate).toHaveBeenCalled();
    });
  });
});
