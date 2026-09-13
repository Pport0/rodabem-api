import { api } from '../api';
import {
  createCaminhao,
  deleteCaminhao,
  getMeuCaminhao,
  scanCaminhao,
  updateCaminhao,
} from '../caminhaoService';
import {
  createDocumento,
  deleteDocumento,
  getDocumentos,
  scanDocumento,
  updateDocumento,
} from '../documentoService';

jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const arquivo = {
  uri: 'file:///tmp/crlv.jpg',
  name: 'crlv.jpg',
  type: 'image/jpeg',
};

const respostaScanCaminhao = {
  arquivoUrl: 'https://cdn/crlv.jpg',
  publicId: 'rodabem/crlv',
  dadosExtraidos: { placa: 'ABC1D23', modelo: 'FH 540' },
  camposObrigatoriosFaltando: [],
  confianca: 'alta',
  mensagem: 'Dados extraídos com sucesso.',
};

const respostaScanDocumento = {
  arquivoUrl: 'https://cdn/cnh.jpg',
  publicId: 'rodabem/cnh',
  dadosExtraidos: { nome: 'CNH', numero: '12345678901' },
  camposObrigatoriosFaltando: ['dataEmissao'],
  confianca: 'media',
  mensagem: 'Extração concluída.',
};

const corpoEnviado = () => jest.mocked(api.post).mock.calls[0][1] as FormData;
const opcoesEnviadas = () => jest.mocked(api.post).mock.calls[0][2] as any;

describe('scanCaminhao', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(api.post).mockResolvedValue({ data: respostaScanCaminhao } as any);
  });

  it('deve enviar o arquivo para o endpoint de scan de caminhao', async () => {
    await scanCaminhao(arquivo);

    expect(api.post).toHaveBeenCalledWith(
      '/caminhao/scan',
      expect.any(FormData),
      expect.anything(),
    );
  });

  it('deve enviar o arquivo no campo documento', async () => {
    await scanCaminhao(arquivo);

    expect(corpoEnviado().get('documento')).toBeTruthy();
  });

  it('deve declarar o envio como multipart', async () => {
    await scanCaminhao(arquivo);

    expect(opcoesEnviadas().headers['Content-Type']).toBe('multipart/form-data');
  });

  it('deve devolver apenas o corpo da resposta', async () => {
    await expect(scanCaminhao(arquivo)).resolves.toEqual(respostaScanCaminhao);
  });

  it('deve propagar falha da API', async () => {
    const falha = new Error('Request failed with status code 400');
    jest.mocked(api.post).mockRejectedValue(falha);

    await expect(scanCaminhao(arquivo)).rejects.toBe(falha);
  });
});

describe('scanDocumento', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(api.post).mockResolvedValue({ data: respostaScanDocumento } as any);
  });

  it('deve enviar o arquivo para o endpoint de scan de documento', async () => {
    await scanDocumento(arquivo);

    expect(api.post).toHaveBeenCalledWith(
      '/documentos/scan',
      expect.any(FormData),
      expect.anything(),
    );
  });

  it('deve enviar o arquivo no campo documento', async () => {
    await scanDocumento(arquivo);

    expect(corpoEnviado().get('documento')).toBeTruthy();
  });

  it('deve declarar o envio como multipart', async () => {
    await scanDocumento(arquivo);

    expect(opcoesEnviadas().headers['Content-Type']).toBe('multipart/form-data');
  });

  it('deve devolver apenas o corpo da resposta', async () => {
    await expect(scanDocumento(arquivo)).resolves.toEqual(respostaScanDocumento);
  });

  it('deve propagar falha da API', async () => {
    const falha = new Error('Request failed with status code 401');
    jest.mocked(api.post).mockRejectedValue(falha);

    await expect(scanDocumento(arquivo)).rejects.toBe(falha);
  });
});

describe('caminhaoService', () => {
  const caminhao = { id: 1, placa: 'ABC1D23', modelo: 'FH 540' };

  beforeEach(() => jest.clearAllMocks());

  it('deve devolver o caminhao quando a API responde com o recurso direto', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: caminhao } as any);

    await expect(getMeuCaminhao()).resolves.toEqual(caminhao);
  });

  it('deve extrair o caminhao quando a API responde com envelope', async () => {
    jest
      .mocked(api.get)
      .mockResolvedValue({ data: { message: 'ok', caminhao } } as any);

    await expect(getMeuCaminhao()).resolves.toEqual(caminhao);
  });

  it('deve devolver nulo quando o envelope nao traz caminhao', async () => {
    jest
      .mocked(api.get)
      .mockResolvedValue({ data: { message: 'Usuário não possui caminhão' } } as any);

    await expect(getMeuCaminhao()).resolves.toBeNull();
  });

  it('deve criar o caminhao e extrair o recurso do envelope', async () => {
    jest
      .mocked(api.post)
      .mockResolvedValue({ data: { message: 'criado', caminhao } } as any);

    await expect(createCaminhao({ placa: 'ABC1D23' } as any)).resolves.toEqual(
      caminhao,
    );
    expect(api.post).toHaveBeenCalledWith('/caminhao', { placa: 'ABC1D23' });
  });

  it('deve atualizar o caminhao e extrair o recurso do envelope', async () => {
    jest
      .mocked(api.put)
      .mockResolvedValue({ data: { message: 'alterado', caminhao } } as any);

    await expect(updateCaminhao({ modelo: 'FH 540' } as any)).resolves.toEqual(
      caminhao,
    );
    expect(api.put).toHaveBeenCalledWith('/caminhao', { modelo: 'FH 540' });
  });

  it('deve remover o caminhao e devolver a mensagem', async () => {
    jest
      .mocked(api.delete)
      .mockResolvedValue({ data: { message: 'Caminhão removido com sucesso' } } as any);

    await expect(deleteCaminhao()).resolves.toEqual({
      message: 'Caminhão removido com sucesso',
    });
  });
});

describe('documentoService', () => {
  const documento = { id: 1, nome: 'CNH', numero: '12345678901' };

  beforeEach(() => jest.clearAllMocks());

  it('deve listar os documentos', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: [documento] } as any);

    await expect(getDocumentos()).resolves.toEqual([documento]);
    expect(api.get).toHaveBeenCalledWith('/documentos');
  });

  it('deve criar o documento quando a API responde com o recurso direto', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: documento } as any);

    await expect(createDocumento({ nome: 'CNH' } as any)).resolves.toEqual(
      documento,
    );
  });

  it('deve extrair o documento quando a API responde com envelope', async () => {
    jest
      .mocked(api.post)
      .mockResolvedValue({ data: { message: 'criado', documento } } as any);

    await expect(createDocumento({ nome: 'CNH' } as any)).resolves.toEqual(
      documento,
    );
  });

  it('deve devolver nulo quando o envelope nao traz documento', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: { message: 'criado' } } as any);

    await expect(createDocumento({} as any)).resolves.toBeNull();
  });

  it('deve atualizar o documento pelo identificador', async () => {
    jest.mocked(api.put).mockResolvedValue({ data: documento } as any);

    await expect(updateDocumento(7, { nome: 'CNH' } as any)).resolves.toEqual(
      documento,
    );
    expect(api.put).toHaveBeenCalledWith('/documentos/7', { nome: 'CNH' });
  });

  it('deve remover o documento pelo identificador', async () => {
    jest.mocked(api.delete).mockResolvedValue({} as any);

    await deleteDocumento(7);

    expect(api.delete).toHaveBeenCalledWith('/documentos/7');
  });
});
