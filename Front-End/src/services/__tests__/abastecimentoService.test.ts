import { api } from '../api';
import {
  createAbastecimento,
  deleteAbastecimento,
  getAbastecimento,
  getAbastecimentos,
  getMediaConsumo,
  updateAbastecimento,
} from '../abastecimentoService';

jest.mock('../api', () => ({
  api: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

const abastecimento = {
  id: 1,
  precoPorLitro: 6.39,
  totalLitros: 320,
  valorTotal: 2044.8,
  quilometragem: 182350,
  tipoCombustivel: 'DIESEL_S10' as const,
  dataAbastecimento: '2026-01-15T10:00:00.000Z',
  caminhaoId: 3,
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

const falhaHttp = (status: number, message: string) =>
  Object.assign(new Error(message), { response: { status, data: { message } } });

beforeEach(() => jest.clearAllMocks());

describe('getAbastecimentos', () => {
  it('deve consultar a listagem do usuario autenticado', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: [] } as any);

    await getAbastecimentos();

    expect(api.get).toHaveBeenCalledWith('/abastecimentos');
  });

  it('deve devolver apenas o corpo da resposta', async () => {
    jest.mocked(api.get).mockResolvedValue({
      data: [abastecimento],
      status: 200,
      headers: {},
    } as any);

    const resultado = await getAbastecimentos();

    expect(resultado).toEqual([abastecimento]);
    expect(resultado).not.toHaveProperty('status');
  });

  it('deve devolver lista vazia quando o usuario nao tem registros', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: [] } as any);

    await expect(getAbastecimentos()).resolves.toEqual([]);
  });

  it('deve propagar falha de autenticacao', async () => {
    const falha = falhaHttp(401, 'Unauthorized');
    jest.mocked(api.get).mockRejectedValue(falha);

    await expect(getAbastecimentos()).rejects.toBe(falha);
  });
});

describe('getAbastecimento', () => {
  it('deve consultar o registro pelo identificador', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: abastecimento } as any);

    await getAbastecimento(7);

    expect(api.get).toHaveBeenCalledWith('/abastecimentos/7');
  });

  it('deve devolver o registro recebido', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: abastecimento } as any);

    await expect(getAbastecimento(1)).resolves.toEqual(abastecimento);
  });

  it('deve propagar recusa de acesso a registro de outro usuario', async () => {
    const falha = falhaHttp(403, 'Você não tem permissão para acessar este abastecimento.');
    jest.mocked(api.get).mockRejectedValue(falha);

    await expect(getAbastecimento(99)).rejects.toBe(falha);
  });

  it('deve propagar registro inexistente', async () => {
    const falha = falhaHttp(404, 'Abastecimento não encontrado.');
    jest.mocked(api.get).mockRejectedValue(falha);

    await expect(getAbastecimento(404)).rejects.toBe(falha);
  });
});

describe('createAbastecimento', () => {
  const novo = {
    precoPorLitro: 6.39,
    totalLitros: 320,
    quilometragem: 182350,
    tipoCombustivel: 'DIESEL_S10' as const,
  };

  it('deve enviar o cadastro ao endpoint de abastecimentos', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: abastecimento } as any);

    await createAbastecimento(novo);

    expect(api.post).toHaveBeenCalledWith('/abastecimentos', novo);
  });

  it('deve repassar os campos opcionais quando informados', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: abastecimento } as any);
    const comOpcionais = {
      ...novo,
      localDescricao: 'BR-116, km 245',
      postoIdentificado: 'Posto Rota Norte',
      observacao: 'tanque cheio',
    };

    await createAbastecimento(comOpcionais);

    expect(api.post).toHaveBeenCalledWith('/abastecimentos', comOpcionais);
  });

  it('deve devolver o registro criado', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: abastecimento } as any);

    await expect(createAbastecimento(novo)).resolves.toEqual(abastecimento);
  });

  it('deve propagar recusa por ausencia de caminhao cadastrado', async () => {
    const falha = falhaHttp(
      400,
      'Você precisa cadastrar um caminhão antes de registrar um abastecimento.',
    );
    jest.mocked(api.post).mockRejectedValue(falha);

    await expect(createAbastecimento(novo)).rejects.toBe(falha);
  });

  it('deve propagar recusa por quilometragem menor que a anterior', async () => {
    const falha = falhaHttp(400, 'A quilometragem informada (500 km) não pode ser menor');
    jest.mocked(api.post).mockRejectedValue(falha);

    await expect(createAbastecimento(novo)).rejects.toBe(falha);
  });
});

describe('updateAbastecimento', () => {
  it('deve enviar a edicao para o registro correto', async () => {
    jest.mocked(api.patch).mockResolvedValue({ data: abastecimento } as any);

    await updateAbastecimento(7, { observacao: 'nota' });

    expect(api.patch).toHaveBeenCalledWith('/abastecimentos/7', { observacao: 'nota' });
  });

  it('deve aceitar edicao parcial de um unico campo', async () => {
    jest.mocked(api.patch).mockResolvedValue({ data: abastecimento } as any);

    await updateAbastecimento(1, { totalLitros: 100 });

    expect(api.patch).toHaveBeenCalledWith('/abastecimentos/1', { totalLitros: 100 });
  });

  it('deve devolver o registro atualizado', async () => {
    const atualizado = { ...abastecimento, observacao: 'nota' };
    jest.mocked(api.patch).mockResolvedValue({ data: atualizado } as any);

    await expect(updateAbastecimento(1, { observacao: 'nota' })).resolves.toEqual(atualizado);
  });

  it('deve propagar recusa de edicao de registro alheio', async () => {
    const falha = falhaHttp(403, 'Você não tem permissão para acessar este abastecimento.');
    jest.mocked(api.patch).mockRejectedValue(falha);

    await expect(updateAbastecimento(99, {})).rejects.toBe(falha);
  });
});

describe('deleteAbastecimento', () => {
  it('deve excluir o registro pelo identificador', async () => {
    jest.mocked(api.delete).mockResolvedValue({ data: {} } as any);

    await deleteAbastecimento(7);

    expect(api.delete).toHaveBeenCalledWith('/abastecimentos/7');
  });

  it('nao deve devolver conteudo algum', async () => {
    jest.mocked(api.delete).mockResolvedValue({ data: { message: 'ok' } } as any);

    await expect(deleteAbastecimento(1)).resolves.toBeUndefined();
  });

  it('deve propagar recusa de exclusao de registro alheio', async () => {
    const falha = falhaHttp(403, 'Você não tem permissão para acessar este abastecimento.');
    jest.mocked(api.delete).mockRejectedValue(falha);

    await expect(deleteAbastecimento(99)).rejects.toBe(falha);
  });
});

describe('getMediaConsumo', () => {
  it('deve consultar o endpoint de media de consumo', async () => {
    jest.mocked(api.get).mockResolvedValue({ data: { mediaConsumo: null } } as any);

    await getMediaConsumo();

    expect(api.get).toHaveBeenCalledWith('/abastecimentos/media-consumo');
  });

  it('deve devolver a media calculada', async () => {
    const media = {
      mediaConsumo: 3.42,
      unidade: 'km/L',
      mensagem: 'Media calculada com 4 trechos.',
      totalAbastecimentos: 5,
      totalTrechosCalculados: 4,
    };
    jest.mocked(api.get).mockResolvedValue({ data: media } as any);

    await expect(getMediaConsumo()).resolves.toEqual(media);
  });

  it('deve devolver media nula quando nao ha trechos suficientes', async () => {
    jest.mocked(api.get).mockResolvedValue({
      data: {
        mediaConsumo: null,
        unidade: 'km/L',
        mensagem: 'Cadastre ao menos dois abastecimentos.',
        totalAbastecimentos: 1,
      },
    } as any);

    const resultado = await getMediaConsumo();

    expect(resultado.mediaConsumo).toBeNull();
    expect(resultado.totalAbastecimentos).toBe(1);
  });

  it('deve propagar falha de autenticacao', async () => {
    const falha = falhaHttp(401, 'Unauthorized');
    jest.mocked(api.get).mockRejectedValue(falha);

    await expect(getMediaConsumo()).rejects.toBe(falha);
  });
});
