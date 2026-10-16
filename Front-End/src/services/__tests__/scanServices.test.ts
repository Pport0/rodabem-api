import { api } from '../api';
import { getMeuCaminhao, createCaminhao } from '../caminhaoService';
import { createDocumento, getDocumentos } from '../documentoService';

jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), delete: jest.fn() },
}));

const caminhao = { id: 1, placa: 'ABC1D23', modelo: 'FH 540' };
const documento = { id: 7, nome: 'CRLV', numero: '123' };

beforeEach(() => jest.clearAllMocks());

describe('normalizacao da resposta do caminhao', () => {
  it('deve devolver o caminhao tanto no formato direto quanto no envelope', async () => {
    jest.mocked(api.get).mockResolvedValueOnce({ data: caminhao } as any);
    await expect(getMeuCaminhao()).resolves.toMatchObject({ placa: 'ABC1D23' });

    jest.mocked(api.get).mockResolvedValueOnce({
      data: { message: 'Caminhão encontrado', caminhao },
    } as any);
    await expect(getMeuCaminhao()).resolves.toMatchObject({ placa: 'ABC1D23' });
  });

  it('deve devolver nulo quando a resposta nao traz caminhao algum', async () => {
    jest.mocked(api.get).mockResolvedValue({
      data: { message: 'Nenhum caminhão cadastrado' },
    } as any);

    await expect(getMeuCaminhao()).resolves.toBeNull();
  });

  it('deve propagar a falha da API em vez de devolver nulo', async () => {
    jest.mocked(api.get).mockRejectedValue(new Error('timeout'));

    await expect(getMeuCaminhao()).rejects.toThrow('timeout');
  });

  it('deve extrair o caminhao criado do envelope da resposta', async () => {
    jest.mocked(api.post).mockResolvedValue({
      data: { message: 'Caminhão cadastrado com sucesso!', caminhao },
    } as any);

    await expect(createCaminhao({} as any)).resolves.toMatchObject({
      placa: 'ABC1D23',
    });
  });
});

describe('normalizacao da resposta do documento', () => {
  it('deve devolver o documento tanto no formato direto quanto no envelope', async () => {
    jest.mocked(api.post).mockResolvedValueOnce({ data: documento } as any);
    await expect(createDocumento({} as any)).resolves.toMatchObject({
      nome: 'CRLV',
    });

    jest.mocked(api.post).mockResolvedValueOnce({
      data: { message: 'Documento cadastrado com sucesso', documento },
    } as any);
    await expect(createDocumento({} as any)).resolves.toMatchObject({
      nome: 'CRLV',
    });
  });

  it('deve devolver lista vazia, e nao erro, quando o usuario nao tem documentos', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: [] } as any);

    await expect(getDocumentos()).resolves.toEqual([]);
  });
});
