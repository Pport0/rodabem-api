import { api } from '../api';
import { deleteCaminhao, updateCaminhao } from '../caminhaoService';
import { deleteDocumento, updateDocumento } from '../documentoService';
import { getHistoricoFrete, simularFrete } from '../freteService';
import { createUser, deleteUser } from '../userService';

jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

beforeEach(() => jest.clearAllMocks());

describe('Caminhao', () => {
  it('deve editar o caminhao do usuario autenticado, sem informar identificador', async () => {
    jest.mocked(api.put).mockResolvedValue({ data: { caminhao: { id: 3 } } } as never);

    await updateCaminhao({ modelo: 'FH 460' } as never);

    expect(api.put).toHaveBeenCalledWith('/caminhao', { modelo: 'FH 460' });
  });

  it('deve excluir o caminhao do usuario autenticado', async () => {
    jest.mocked(api.delete).mockResolvedValue({ data: { message: 'ok' } } as never);

    await expect(deleteCaminhao()).resolves.toMatchObject({ message: 'ok' });
    expect(api.delete).toHaveBeenCalledWith('/caminhao');
  });
});

describe('Documento', () => {
  it('deve editar o documento pelo identificador', async () => {
    jest.mocked(api.put).mockResolvedValue({ data: { documento: { id: 7 } } } as never);

    await updateDocumento(7, { nome: 'CRLV' } as never);

    expect(api.put).toHaveBeenCalledWith('/documentos/7', { nome: 'CRLV' });
  });

  it('deve devolver nulo quando a resposta nao traz o documento', async () => {
    jest.mocked(api.put).mockResolvedValue({ data: { message: 'Atualizado' } } as never);

    await expect(updateDocumento(7, { nome: 'CRLV' } as never)).resolves.toBeNull();
  });

  it('deve excluir o documento pelo identificador', async () => {
    jest.mocked(api.delete).mockResolvedValue({ data: {} } as never);

    await deleteDocumento(7);

    expect(api.delete).toHaveBeenCalledWith('/documentos/7');
  });
});

describe('Frete', () => {
  it('deve enviar a simulacao para a rota de simular', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: { valorMinimoAntt: 100 } } as never);

    await expect(
      simularFrete({ origem: 'A', destino: 'B' } as never),
    ).resolves.toMatchObject({ valorMinimoAntt: 100 });

    expect(api.post).toHaveBeenCalledWith('/frete/simular', { origem: 'A', destino: 'B' });
  });

  it('deve buscar o historico de simulacoes', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: [{ id: 1 }] } as never);

    await expect(getHistoricoFrete()).resolves.toHaveLength(1);
    expect(api.get).toHaveBeenCalledWith('/frete/historico');
  });
});

describe('Usuario', () => {
  it('deve cadastrar pela rota publica de usuarios', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: { id: 1 } } as never);

    await createUser({ nome: 'Gabriel', cpf: '52998224725', senha: '123456' } as never);

    expect(api.post).toHaveBeenCalledWith('/users', expect.objectContaining({ nome: 'Gabriel' }));
  });

  it('deve excluir a conta pelo identificador do usuario', async () => {
    jest.mocked(api.delete).mockResolvedValue({ data: { message: 'ok' } } as never);

    await expect(deleteUser(4)).resolves.toMatchObject({ message: 'ok' });
    expect(api.delete).toHaveBeenCalledWith('/users/4');
  });
});
