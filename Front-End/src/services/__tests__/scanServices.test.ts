import { api } from '../api';
import { getMeuCaminhao, createCaminhao } from '../caminhaoService';
import { createDocumento, getDocumentos } from '../documentoService';

/**
 * Normalizacao da resposta da API.
 *
 * O back nao e consistente na forma: algumas rotas devolvem o recurso direto,
 * outras embrulham num envelope junto da mensagem — `{ message, caminhao }`.
 * Os servicos escondem essa diferenca do resto do aplicativo.
 *
 * O endereco dos endpoints e o nome do campo do arquivo nao sao afirmados aqui:
 * estao em `app/__tests__/scan-flow.integration.test.tsx`, que exercita o servico de verdade a partir da tela.
 */
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
    // Usuario sem caminhao: a tela precisa distinguir "nao tem" de "falhou".
    jest.mocked(api.get).mockResolvedValue({
      data: { message: 'Nenhum caminhão cadastrado' },
    } as any);

    await expect(getMeuCaminhao()).resolves.toBeNull();
  });

  it('deve propagar a falha da API em vez de devolver nulo', async () => {
    // Se o erro virasse nulo, a tela diria "nenhum caminhao cadastrado" para quem tem um — e o usuario cadastraria outro por cima.
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
