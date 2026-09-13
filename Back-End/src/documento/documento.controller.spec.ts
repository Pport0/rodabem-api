import { BadRequestException } from '@nestjs/common';
import { DocumentoController } from './documento.controller';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('DocumentoController - endpoint de scan', () => {
  let controller: DocumentoController;

  const documentoService = {};
  const scanService = { processarDocumento: jest.fn() };

  const arquivo = () =>
    ({
      mimetype: 'application/pdf',
      size: 2048,
      buffer: Buffer.from('pdf'),
      originalname: 'cnh.pdf',
    }) as Express.Multer.File;

  const resultado = {
    arquivoUrl: 'https://cdn/cnh.pdf',
    publicId: 'rodabem/cnh',
    dadosExtraidos: { nome: 'CNH', numero: '12345678901' },
    camposObrigatoriosFaltando: ['dataEmissao', 'dataVencimento'],
    confianca: 'media',
    mensagem:
      'Extração concluída. Preencha manualmente: dataEmissao, dataVencimento.',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new DocumentoController(
      documentoService as any,
      scanService as any,
    );
  });

  it('deve recusar a requisicao quando nenhum arquivo e enviado', async () => {
    await expect(controller.scan(undefined)).rejects.toThrow(
      new BadRequestException('Nenhum arquivo enviado.'),
    );
  });

  it('deve recusar a requisicao quando o arquivo vem nulo', async () => {
    await expect(controller.scan(null)).rejects.toThrow(BadRequestException);
  });

  it('nao deve acionar o processamento quando falta o arquivo', async () => {
    await expect(controller.scan(undefined)).rejects.toThrow(BadRequestException);

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

  it('deve propagar falha no envio do arquivo vinda do servico', async () => {
    scanService.processarDocumento.mockRejectedValue(
      new BadRequestException('Erro ao fazer upload do arquivo.'),
    );

    await expect(controller.scan(arquivo())).rejects.toThrow(
      'Erro ao fazer upload do arquivo.',
    );
  });

  it('o endpoint de scan exige autenticacao', () => {
    const guards = Reflect.getMetadata(
      '__guards__',
      DocumentoController.prototype.scan,
    );

    expect(guards).toEqual([JwtAuthGuard]);
  });
});
