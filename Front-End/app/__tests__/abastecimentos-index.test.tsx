import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';
import { Alert } from 'react-native';

import AbastecimentosScreen from '../abastecimentos/index';
import {
  deleteAbastecimento,
  getAbastecimentos,
  getMediaConsumo,
} from '@/services/abastecimentoService';
import { Toast } from '@/shared/ui/molecules/Toast';
import { queryClient } from '@/utils/queryClient';

jest.mock('@/services/abastecimentoService', () => ({
  getAbastecimentos: jest.fn(),
  getMediaConsumo: jest.fn(),
  deleteAbastecimento: jest.fn(),
}));

jest.mock('@/shared/ui/molecules/Toast', () => ({
  Toast: { show: jest.fn() },
}));

jest.mock('@/utils/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

const abastecimento = {
  id: 7,
  precoPorLitro: 6.39,
  totalLitros: 320,
  valorTotal: 2044.8,
  quilometragem: 182350,
  tipoCombustivel: 'DIESEL_S10' as const,
  dataAbastecimento: '2026-01-15T12:00:00.000Z',
  caminhaoId: 3,
  createdAt: '2026-01-15T12:00:00.000Z',
  updatedAt: '2026-01-15T12:00:00.000Z',
};

const media = {
  mediaConsumo: 3.4567,
  unidade: 'km/L',
  mensagem: 'Media calculada com 4 trechos.',
  totalAbastecimentos: 5,
  totalTrechosCalculados: 4,
};

const pendencias: ((valor: unknown) => void)[] = [];
const criarPendencia = () =>
  new Promise((resolve) => {
    pendencias.push(resolve);
  });

const montarTela = async () => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );

  return render(<AbastecimentosScreen />, { wrapper });
};

/** Monta a tela e espera o primeiro registro aparecer na lista. */
const montarComRegistros = async (registros = [abastecimento], resumo = media) => {
  jest.mocked(getAbastecimentos).mockResolvedValue(registros as any);
  jest.mocked(getMediaConsumo).mockResolvedValue(resumo as any);

  await montarTela();
  await waitFor(() => expect(screen.getAllByText('Editar').length).toBeGreaterThan(0));
};

/** Dispara a exclusao e devolve os botoes oferecidos no alerta de confirmacao. */
const botoesDoAlerta = () => {
  const [, , botoes] = jest.mocked(Alert.alert).mock.calls[0];
  return botoes as { text: string; onPress?: () => void }[];
};

const confirmarExclusao = async () => {
  await fireEvent.press(screen.getByText('Excluir'));
  botoesDoAlerta().find((b) => b.text === 'Excluir')?.onPress?.();
};

beforeEach(() => {
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  jest.mocked(getAbastecimentos).mockResolvedValue([]);
  jest.mocked(getMediaConsumo).mockResolvedValue({
    mediaConsumo: null,
    unidade: 'km/L',
    mensagem: 'Cadastre ao menos dois abastecimentos.',
    totalAbastecimentos: 0,
  } as any);
  jest.mocked(deleteAbastecimento).mockResolvedValue(undefined);
});

afterEach(() => {
  pendencias.splice(0).forEach((resolver) => resolver([]));
});

describe('Listagem de abastecimentos - estados da lista', () => {
  it('deve avisar que esta carregando antes da resposta', async () => {
    jest.mocked(getAbastecimentos).mockReturnValue(criarPendencia() as any);

    await montarTela();

    expect(screen.getByText('Carregando abastecimentos...')).toBeTruthy();
  });

  it('deve convidar ao cadastro quando nao ha registro algum', async () => {
    await montarTela();

    await waitFor(() =>
      expect(screen.getByText('Nenhum abastecimento cadastrado')).toBeTruthy(),
    );
    expect(
      screen.getByText('Registre seus abastecimentos para acompanhar consumo e custos.'),
    ).toBeTruthy();
  });


  it('deve listar um cartao por registro', async () => {
    await montarComRegistros([
      abastecimento,
      { ...abastecimento, id: 8, tipoCombustivel: 'ARLA_32' as const },
    ]);

    expect(screen.getByText('Diesel S10')).toBeTruthy();
    expect(screen.getByText('Arla 32')).toBeTruthy();
  });
});

describe('Listagem de abastecimentos - dados do cartao', () => {


  // A exibicao de numeros no padrao brasileiro e requisito, nao preferencia. Virgula decimal e ponto como
  // separador de milhar, em todo valor que o usuario le.
  it('deve exibir os litros com virgula decimal, no padrao brasileiro', async () => {
    await montarComRegistros();

    expect(screen.getByText(/320,00/)).toBeTruthy();
  });

  it('deve exibir a quilometragem com separador de milhar', async () => {
    await montarComRegistros();

    expect(screen.getByText(/182\.350/)).toBeTruthy();
  });

  it('deve exibir o valor total em reais', async () => {
    await montarComRegistros();

    expect(screen.getByText(/2\.044,80/)).toBeTruthy();
  });




  it('deve omitir posto, local e observacao quando o registro nao os traz', async () => {
    await montarComRegistros();

    expect(screen.queryByText(/^Posto:/)).toBeNull();
    expect(screen.queryByText(/^Local:/)).toBeNull();
    expect(screen.queryByText(/^Obs:/)).toBeNull();
  });

  it('deve exibir posto, local e observacao quando o registro os traz', async () => {
    await montarComRegistros([
      {
        ...abastecimento,
        postoIdentificado: 'Posto Rota Norte',
        localDescricao: 'BR-116, km 245',
        observacao: 'tanque cheio',
      },
    ]);

    expect(screen.getByText('Posto: Posto Rota Norte')).toBeTruthy();
    expect(screen.getByText('Local: BR-116, km 245')).toBeTruthy();
    expect(screen.getByText('Obs: tanque cheio')).toBeTruthy();
  });
});

describe('Listagem de abastecimentos - tipo de combustivel', () => {
  it('deve nomear por extenso cada combustivel que o back reconhece', async () => {
    // O back guarda `DIESEL_S500`; mostrar o codigo cru na tela faria o motorista conferir se
    // abasteceu o combustivel certo lendo nome de constante.
    await montarComRegistros([
      { ...abastecimento, id: 11, tipoCombustivel: 'DIESEL_S500' as const },
    ]);

    expect(screen.getByText('Diesel S500')).toBeTruthy();
  });

  it('deve exibir como veio o combustivel que ainda nao conhece', async () => {
    // Quando o back ganhar um tipo novo — GNV, biodiesel — a listagem antiga continua sendo
    // aberta. Deixar o campo em branco esconderia o dado; mostrar o codigo pelo menos informa.
    await montarComRegistros([
      { ...abastecimento, id: 12, tipoCombustivel: 'GNV' as never },
    ]);

    expect(screen.getByText('GNV')).toBeTruthy();
  });
});

describe('Listagem de abastecimentos - media de consumo', () => {


  it('deve exibir a media com virgula decimal e a unidade', async () => {
    await montarComRegistros();

    expect(screen.getByText(/3,46 km\/L/)).toBeTruthy();
  });

  it('deve exibir tracos quando ainda nao ha media calculada', async () => {
    await montarTela();

    await waitFor(() => expect(screen.getByText('--')).toBeTruthy());
  });




  it('deve exibir media zero como valor, e nao como ausencia de dado', async () => {
    await montarComRegistros([abastecimento], { ...media, mediaConsumo: 0 });

    expect(screen.getByText('0,00 km/L')).toBeTruthy();
  });

  it('nao deve confundir media zero com media ainda nao calculada', async () => {
    await montarComRegistros([abastecimento], { ...media, mediaConsumo: 0 });

    expect(screen.queryByText('--')).toBeNull();
  });
});

describe('Listagem de abastecimentos - exclusao', () => {
  it('deve pedir confirmacao antes de excluir', async () => {
    await montarComRegistros();

    await fireEvent.press(screen.getByText('Excluir'));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Excluir abastecimento',
      expect.stringContaining('15/01/2026'),
      expect.any(Array),
    );
  });


  it('nao deve excluir quando o usuario cancela', async () => {
    await montarComRegistros();
    await fireEvent.press(screen.getByText('Excluir'));

    botoesDoAlerta().find((b) => b.text === 'Cancelar')?.onPress?.();

    expect(deleteAbastecimento).not.toHaveBeenCalled();
  });

  it('deve excluir o registro confirmado', async () => {
    await montarComRegistros();

    await confirmarExclusao();

    await waitFor(() => expect(deleteAbastecimento).toHaveBeenCalled());
    expect(jest.mocked(deleteAbastecimento).mock.calls[0][0]).toBe(7);
  });


  it('deve invalidar a listagem e a media apos excluir', async () => {
    await montarComRegistros();

    await confirmarExclusao();

    await waitFor(() =>
      expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
        queryKey: ['abastecimentos'],
      }),
    );
    expect(queryClient.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ['media-consumo'],
    });
  });

  it('deve avisar quando a exclusao falha', async () => {
    jest.mocked(deleteAbastecimento).mockRejectedValue(new Error('403'));
    await montarComRegistros();

    await confirmarExclusao();

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        'Nao foi possivel excluir o abastecimento.',
        expect.objectContaining({ type: 'error' }),
      ),
    );
  });

});

describe('Listagem de abastecimentos - navegacao', () => {
  it('deve levar ao cadastro de um novo abastecimento', async () => {
    await montarTela();

    await fireEvent.press(screen.getByText('NOVO ABASTECIMENTO'));

    expect(router.push).toHaveBeenCalledWith('/abastecimentos/novo');
  });

  it('deve levar a edicao carregando o registro escolhido', async () => {
    await montarComRegistros();

    await fireEvent.press(screen.getByText('Editar'));

    expect(router.push).toHaveBeenCalledWith({
      pathname: '/abastecimentos/novo',
      params: { id: '7' },
    });
  });

  it('deve oferecer o cadastro mesmo com a lista vazia', async () => {
    await montarTela();

    await waitFor(() =>
      expect(screen.getByText('Nenhum abastecimento cadastrado')).toBeTruthy(),
    );
    expect(screen.getByText('NOVO ABASTECIMENTO')).toBeTruthy();
  });
});
