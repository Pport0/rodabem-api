import { BadRequestException } from '@nestjs/common';
import { CaminhaoController } from './caminhao.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('CaminhaoController - endpoint de scan', () => {
  let controller: CaminhaoController;

  const caminhaoService = {};
  const scanService = { processarDocumento: jest.fn() };

  const arquivo = () =>
    ({
      mimetype: 'image/jpeg',
      size: 1024,
      buffer: Buffer.from('imagem'),
      originalname: 'crlv.jpg',
    }) as Express.Multer.File;

  const resultado = {
    arquivoUrl: 'https://cdn/crlv.jpg',
    publicId: 'rodabem/crlv',
    dadosExtraidos: { placa: 'ABC1D23' },
    camposObrigatoriosFaltando: [],
    confianca: 'alta',
    mensagem: 'Dados extraídos com sucesso. Revise antes de confirmar o cadastro.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new CaminhaoController(
      caminhaoService as any,
      scanService as any,
    );
  });

  it('deve recusar a requisicao quando nenhum arquivo e enviado', async () => {
    await expect(controller.scan(undefined as any)).rejects.toThrow(
      new BadRequestException('Nenhum arquivo enviado.'),
    );
  });

  it('deve recusar a requisicao quando o arquivo vem nulo', async () => {
    await expect(controller.scan(null as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('nao deve acionar o processamento quando falta o arquivo', async () => {
    await expect(controller.scan(undefined as any)).rejects.toThrow(
      BadRequestException,
    );

    expect(scanService.processarDocumento).not.toHaveBeenCalled();
  });

  it('deve repassar o arquivo recebido ao servico de scan', async () => {
    scanService.processarDocumento.mockResolvedValue(resultado);
    const enviado = arquivo();

    await controller.scan(enviado);

    expect(scanService.processarDocumento).toHaveBeenCalledWith(enviado);
  });

  it('deve devolver o resultado da extracao sem alteracao', async () => {
    scanService.processarDocumento.mockResolvedValue(resultado);

    await expect(controller.scan(arquivo())).resolves.toEqual(resultado);
  });

  it('deve propagar a recusa de formato invalido vinda do servico', async () => {
    scanService.processarDocumento.mockRejectedValue(
      new BadRequestException(
        'Envie o documento em um formato compatível. Formatos aceitos: PDF, JPG, JPEG, PNG.',
      ),
    );

    await expect(controller.scan(arquivo())).rejects.toThrow(
      'Formatos aceitos: PDF, JPG, JPEG, PNG.',
    );
  });

  it('deve propagar a recusa por tamanho excedido vinda do servico', async () => {
    scanService.processarDocumento.mockRejectedValue(
      new BadRequestException('Arquivo muito grande. O tamanho máximo permitido é 10MB.'),
    );

    await expect(controller.scan(arquivo())).rejects.toThrow(
      'Arquivo muito grande. O tamanho máximo permitido é 10MB.',
    );
  });

  it('o endpoint de scan nao exige autenticacao', async () => {
    const guards = Reflect.getMetadata('__guards__', CaminhaoController.prototype.scan);

    expect(guards).toBeUndefined();
  });

  it('os demais endpoints do controller exigem autenticacao', async () => {
    const guardsDoCreate = Reflect.getMetadata(
      '__guards__',
      CaminhaoController.prototype.create,
    );

    expect(guardsDoCreate).toEqual([JwtAuthGuard]);
  });
});
