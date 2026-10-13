import { api } from '../api';
import {
  deleteAbastecimento,
  getAbastecimento,
  updateAbastecimento,
} from '../abastecimentoService';

jest.mock('../api', () => ({
  api: { get: jest.fn(), post: jest.fn(), put: jest.fn(), patch: jest.fn(), delete: jest.fn() },
}));

const registro = { id: 3, totalLitros: 100, precoPorLitro: 6, quilometragem: 180000 };

beforeEach(() => jest.clearAllMocks());

it('deve devolver o abastecimento consultado pelo identificador', async () => {
  jest.mocked(api.get).mockResolvedValue({ data: registro } as any);

  await expect(getAbastecimento(3)).resolves.toMatchObject({ id: 3 });
});

it('deve devolver o registro ja atualizado apos a edicao', async () => {
  // A tela confia no retorno para redesenhar. Devolver o registro antigo mostraria o valor anterior como se a edicao nao tivesse acontecido.
  jest.mocked(api.patch).mockResolvedValue({
    data: { ...registro, precoPorLitro: 7 },
  } as any);

  await expect(updateAbastecimento(3, { precoPorLitro: 7 } as any)).resolves.toMatchObject({
    precoPorLitro: 7,
  });
});

it('deve propagar a recusa ao editar registro de outro usuario', async () => {
  // Estado que a API real devolve, mas que a tela nao consegue provocar: o aplicativo so lista os registros do proprio usuario.
  jest.mocked(api.patch).mockRejectedValue(
    Object.assign(new Error('Forbidden'), { response: { status: 403 } }),
  );

  await expect(updateAbastecimento(3, {} as any)).rejects.toThrow('Forbidden');
});

it('deve propagar a recusa ao excluir registro de outro usuario', async () => {
  jest.mocked(api.delete).mockRejectedValue(
    Object.assign(new Error('Forbidden'), { response: { status: 403 } }),
  );

  await expect(deleteAbastecimento(3)).rejects.toThrow('Forbidden');
});
