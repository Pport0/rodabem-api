import { BadRequestException } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryService } from './cloudinary.service';

jest.mock('cloudinary', () => ({
  v2: {
    config: jest.fn(),
    uploader: {
      upload_stream: jest.fn(),
      destroy: jest.fn(),
    },
  },
}));

describe('CloudinaryService', () => {
  let service: CloudinaryService;
  let silenciarErro: jest.SpyInstance;

  const configService = {
    get: jest.fn((chave: string) => `valor-${chave}`),
  };

  const buffer = Buffer.from('conteudo-do-arquivo');

  const responderUpload = (erro: unknown, resultado: unknown) => {
    jest
      .mocked(cloudinary.uploader.upload_stream)
      .mockImplementation(((_opcoes: any, callback: any) => {
        return { end: jest.fn(() => callback(erro, resultado)) };
      }) as any);
  };

  const opcoesDoUpload = () =>
    jest.mocked(cloudinary.uploader.upload_stream).mock.calls[0][0] as any;

  beforeAll(() => {
    silenciarErro = jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterAll(() => silenciarErro.mockRestore());

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CloudinaryService(configService as any);
  });

  describe('configuracao', () => {
    it('deve configurar o cloudinary com as credenciais do ConfigService', () => {
      expect(cloudinary.config).toHaveBeenCalledWith({
        cloud_name: 'valor-CLOUDINARY_CLOUD_NAME',
        api_key: 'valor-CLOUDINARY_API_KEY',
        api_secret: 'valor-CLOUDINARY_API_SECRET',
      });
    });

    it('deve configurar o cloudinary uma unica vez por instancia', () => {
      expect(cloudinary.config).toHaveBeenCalledTimes(1);
    });
  });

  describe('uploadFile', () => {
    it('deve resolver com a url segura e o identificador publico', async () => {
      responderUpload(null, {
        secure_url: 'https://cdn/arquivo.jpg',
        public_id: 'rodabem/arquivo',
      });

      await expect(
        service.uploadFile(buffer, 'image/jpeg', 'documento.jpg'),
      ).resolves.toEqual({
        url: 'https://cdn/arquivo.jpg',
        publicId: 'rodabem/arquivo',
      });
    });

    it('deve enviar o buffer recebido para o stream de upload', async () => {
      const end = jest.fn((cb?: unknown) => cb);
      jest
        .mocked(cloudinary.uploader.upload_stream)
        .mockImplementation(((_opcoes: any, callback: any) => ({
          end: jest.fn((dados: Buffer) => {
            end(dados);
            callback(null, { secure_url: 'u', public_id: 'p' });
          }),
        })) as any);

      await service.uploadFile(buffer, 'image/jpeg', 'documento.jpg');

      expect(end).toHaveBeenCalledWith(buffer);
    });

    it('deve enviar o arquivo para a pasta de documentos de caminhao', async () => {
      responderUpload(null, { secure_url: 'u', public_id: 'p' });

      await service.uploadFile(buffer, 'image/jpeg', 'documento.jpg');

      expect(opcoesDoUpload().folder).toBe('rodabem/documentos-caminhao');
    });

    it('deve detectar o tipo do recurso automaticamente', async () => {
      responderUpload(null, { secure_url: 'u', public_id: 'p' });

      await service.uploadFile(buffer, 'application/pdf', 'documento.pdf');

      expect(opcoesDoUpload().resource_type).toBe('auto');
    });

    it('deve substituir espacos do nome original por underscore', async () => {
      responderUpload(null, { secure_url: 'u', public_id: 'p' });

      await service.uploadFile(buffer, 'image/jpeg', 'meu documento final.jpg');

      expect(opcoesDoUpload().public_id).toMatch(/^\d+-meu_documento_final\.jpg$/);
    });

    it('deve prefixar o identificador publico com o instante do envio', async () => {
      responderUpload(null, { secure_url: 'u', public_id: 'p' });
      const antes = Date.now();

      await service.uploadFile(buffer, 'image/jpeg', 'documento.jpg');

      const prefixo = Number(opcoesDoUpload().public_id.split('-')[0]);
      expect(prefixo).toBeGreaterThanOrEqual(antes);
    });

    it('deve definir um timeout para o envio', async () => {
      responderUpload(null, { secure_url: 'u', public_id: 'p' });

      await service.uploadFile(buffer, 'image/jpeg', 'documento.jpg');

      expect(opcoesDoUpload().timeout).toBe(120000);
    });

    it('deve rejeitar quando o cloudinary retorna erro', async () => {
      responderUpload(new Error('falha de rede'), null);

      await expect(
        service.uploadFile(buffer, 'image/jpeg', 'documento.jpg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar com mensagem propria em vez de expor o erro do cloudinary', async () => {
      responderUpload(new Error('Invalid api_key'), null);

      await expect(
        service.uploadFile(buffer, 'image/jpeg', 'documento.jpg'),
      ).rejects.toThrow('Erro ao fazer upload do arquivo.');
    });

    it('deve rejeitar quando nao ha erro mas tambem nao ha resultado', async () => {
      responderUpload(null, null);

      await expect(
        service.uploadFile(buffer, 'image/jpeg', 'documento.jpg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve rejeitar quando o resultado vem indefinido', async () => {
      responderUpload(null, undefined);

      await expect(
        service.uploadFile(buffer, 'image/jpeg', 'documento.jpg'),
      ).rejects.toThrow(BadRequestException);
    });

    it('deve registrar o erro do cloudinary no console', async () => {
      const falha = new Error('falha de rede');
      responderUpload(falha, null);

      await expect(
        service.uploadFile(buffer, 'image/jpeg', 'documento.jpg'),
      ).rejects.toThrow(BadRequestException);

      expect(silenciarErro).toHaveBeenCalledWith('Cloudinary error:', falha);
    });
  });

  describe('deleteFile', () => {
    it('deve remover o arquivo pelo identificador publico', async () => {
      jest.mocked(cloudinary.uploader.destroy).mockResolvedValue({} as any);

      await service.deleteFile('rodabem/arquivo');

      expect(cloudinary.uploader.destroy).toHaveBeenCalledWith('rodabem/arquivo');
    });

    it('deve propagar falha ao remover o arquivo', async () => {
      jest
        .mocked(cloudinary.uploader.destroy)
        .mockRejectedValue(new Error('nao encontrado'));

      await expect(service.deleteFile('rodabem/arquivo')).rejects.toThrow(
        'nao encontrado',
      );
    });
  });
});
