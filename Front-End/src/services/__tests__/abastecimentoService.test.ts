import { api } from '../api';
import {
  createAbastecimento,
  deleteAbastecimento,
  getAbastecimento,
  getAbastecimentos,
  getMediaConsumo,
  scanHodometro,
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
  jest.mocked(api.patch).mockResolvedValue({
    data: { ...registro, precoPorLitro: 7 },
  } as any);

  await expect(updateAbastecimento(3, { precoPorLitro: 7 } as any)).resolves.toMatchObject({
    precoPorLitro: 7,
  });
});

it('deve propagar a recusa ao editar registro de outro usuario', async () => {
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

it('deve listar os abastecimentos do usuario autenticado', async () => {
  jest.mocked(api.get).mockResolvedValue({ data: [registro] } as any);

  await expect(getAbastecimentos()).resolves.toHaveLength(1);
  expect(api.get).toHaveBeenCalledWith('/abastecimentos');
});

it('deve devolver o registro criado, com o identificador que o back atribuiu', async () => {
  jest.mocked(api.post).mockResolvedValue({ data: registro } as any);

  await expect(
    createAbastecimento({ totalLitros: 100, precoPorLitro: 6 } as any),
  ).resolves.toMatchObject({ id: 3 });

  expect(api.post).toHaveBeenCalledWith('/abastecimentos', {
    totalLitros: 100,
    precoPorLitro: 6,
  });
});

it('deve buscar a media de consumo numa rota propria, e nao derivar da lista', async () => {
  jest.mocked(api.get).mockResolvedValue({ data: { mediaConsumo: 3.2 } } as any);

  await expect(getMediaConsumo()).resolves.toMatchObject({ mediaConsumo: 3.2 });
  expect(api.get).toHaveBeenCalledWith('/abastecimentos/media-consumo');
});

it('deve enviar a foto do hodometro no campo "imagem" da rota de scan', async () => {
  const resposta = { quilometragem: 182350, confianca: 'media', mensagem: 'ok' };
  jest.mocked(api.post).mockResolvedValue({ data: resposta } as any);
  const arquivo = { uri: 'file:///hodometro.jpg', name: 'hodometro.jpg', type: 'image/jpeg' };
  // No React Native o FormData aceita {uri, name, type}; o do Node converteria em texto, por isso o spy.
  const anexar = jest.spyOn(FormData.prototype, 'append');

  await expect(scanHodometro(arquivo)).resolves.toEqual(resposta);

  const [rota, corpo, config] = jest.mocked(api.post).mock.calls[0] as any[];
  expect(rota).toBe('/abastecimentos/scan');
  expect(corpo).toBeInstanceOf(FormData);
  expect(anexar).toHaveBeenCalledWith('imagem', arquivo);
  expect(config.headers['Content-Type']).toBe('multipart/form-data');
  anexar.mockRestore();
});
