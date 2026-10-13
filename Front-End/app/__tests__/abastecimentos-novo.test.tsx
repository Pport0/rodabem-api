import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { ReactNode } from 'react';

import NovoAbastecimento from '../abastecimentos/novo';
import {
  createAbastecimento,
  getAbastecimento,
  updateAbastecimento,
} from '@/services/abastecimentoService';
import { Toast } from '@/shared/ui/molecules/Toast';
import { queryClient } from '@/utils/queryClient';

jest.mock('@/services/abastecimentoService', () => ({
  getAbastecimento: jest.fn(),
  createAbastecimento: jest.fn(),
  updateAbastecimento: jest.fn(),
}));

jest.mock('@/shared/ui/molecules/Toast', () => ({
  Toast: { show: jest.fn() },
}));

jest.mock('@/utils/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const CAMPO_PRECO = 'Ex: 6.39';
const CAMPO_LITROS = 'Ex: 320';
const CAMPO_KM = 'Ex: 182350';
const CAMPO_POSTO = 'Ex: Posto Rota Norte';
const CAMPO_LOCAL = 'Ex: BR-116, km 245';
const CAMPO_OBSERVACAO = 'Informacoes adicionais';

const registroExistente = {
  id: 7,
  precoPorLitro: 6.39,
  totalLitros: 320,
  valorTotal: 2044.8,
  quilometragem: 182350,
  tipoCombustivel: 'DIESEL_S500' as const,
  dataAbastecimento: '2026-01-15T10:00:00.000Z',
  localDescricao: 'BR-116, km 245',
  postoIdentificado: 'Posto Rota Norte',
  observacao: 'tanque cheio',
  caminhaoId: 3,
  createdAt: '2026-01-15T10:00:00.000Z',
  updatedAt: '2026-01-15T10:00:00.000Z',
};

const montarTela = async () => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );

  return render(<NovoAbastecimento />, { wrapper });
};

/** Monta a tela em modo edicao e espera o formulario ser preenchido pela consulta. */
const montarEdicao = async (registro = registroExistente) => {
  jest.mocked(useLocalSearchParams).mockReturnValue({ id: String(registro.id) });
  jest.mocked(getAbastecimento).mockResolvedValue(registro as any);

  await montarTela();
  await waitFor(() => expect(screen.getByDisplayValue(String(registro.quilometragem))).toBeTruthy());
};

const preencherObrigatorios = async (
  preco = '6.39',
  litros = '320',
  km = '182350',
) => {
  await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_PRECO), preco);
  await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_LITROS), litros);
  await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_KM), km);
};

const enviar = async (rotulo = 'CADASTRAR ABASTECIMENTO') =>
  fireEvent.press(screen.getByText(rotulo));

/**
 * Promessa que so termina quando o teste manda, para observar estados
 * intermediarios sem deixar operacao pendurada apos o teste.
 */
const pendencias: ((valor: unknown) => void)[] = [];
const criarPendencia = () =>
  new Promise((resolve) => {
    pendencias.push(resolve);
  });

afterEach(() => {
  pendencias.splice(0).forEach((resolver) => resolver(registroExistente));
});

beforeEach(() => {
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(createAbastecimento).mockResolvedValue(registroExistente as any);
  jest.mocked(updateAbastecimento).mockResolvedValue(registroExistente as any);
});

describe('Novo abastecimento - validacao do formulario', () => {
  it('deve acusar os tres campos obrigatorios quando o formulario esta vazio', async () => {
    await montarTela();

    await enviar();

    expect(screen.getByText('Informe um preco por litro valido.')).toBeTruthy();
    expect(screen.getByText('Informe a quantidade de litros.')).toBeTruthy();
    expect(screen.getByText('Informe a quilometragem atual.')).toBeTruthy();
  });


  it('deve acusar preco igual a zero', async () => {
    await montarTela();
    await preencherObrigatorios('0', '320', '182350');

    await enviar();

    expect(screen.getByText('Informe um preco por litro valido.')).toBeTruthy();
    expect(createAbastecimento).not.toHaveBeenCalled();
  });



  it('deve enviar quando os tres campos obrigatorios sao validos', async () => {
    await montarTela();
    await preencherObrigatorios();

    await enviar();

    await waitFor(() => expect(createAbastecimento).toHaveBeenCalled());
  });

  it('deve aceitar quilometragem zero, para caminhao zero-quilometro', async () => {
    await montarTela();
    await preencherObrigatorios('6.39', '320', '0');

    await enviar();

    await waitFor(() =>
      expect(createAbastecimento).toHaveBeenCalledWith(
        expect.objectContaining({ quilometragem: 0 }),
      ),
    );
  });

  // Zero e valor valido; campo vazio nao e. Number('') tambem da 0, entao a
  // distincao tem de ser feita no texto digitado, nao no numero convertido.
  it('deve recusar quilometragem em branco, mesmo aceitando zero', async () => {
    await montarTela();
    await preencherObrigatorios('6.39', '320', '');

    await enviar();

    expect(screen.getByText('Informe a quilometragem atual.')).toBeTruthy();
    expect(createAbastecimento).not.toHaveBeenCalled();
  });
});

describe('Novo abastecimento - tratamento do que e digitado', () => {
  it('deve descartar letras digitadas no preco', async () => {
    await montarTela();
    const campo = screen.getByPlaceholderText(CAMPO_PRECO);

    await fireEvent.changeText(campo, 'R$ 6,39abc');

    expect(campo.props.value).toBe('6,39');
  });



  it('deve aceitar virgula como separador decimal no preco', async () => {
    await montarTela();
    await preencherObrigatorios('6,39', '320', '182350');

    await enviar();

    await waitFor(() =>
      expect(createAbastecimento).toHaveBeenCalledWith(
        expect.objectContaining({ precoPorLitro: 6.39 }),
      ),
    );
  });

  it('deve interpretar o separador de milhar no padrao brasileiro', async () => {
    await montarTela();

    await preencherObrigatorios('6.39', '1.234,56', '182350');
    await enviar();

    await waitFor(() =>
      expect(createAbastecimento).toHaveBeenCalledWith(
        expect.objectContaining({ totalLitros: 1234.56 }),
      ),
    );
  });

  it('deve exibir o total estimado com o separador de milhar nos litros', async () => {
    await montarTela();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_PRECO), '6');
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_LITROS), '1.234,56');

    expect(screen.getByText(/7\.407,36/)).toBeTruthy();
  });

});

describe('Novo abastecimento - valor total estimado', () => {


  it('deve multiplicar preco por litros e exibir em reais', async () => {
    await montarTela();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_PRECO), '6');
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_LITROS), '100');

    expect(screen.getByText(/600,00/)).toBeTruthy();
  });


  it('deve considerar a virgula decimal no total estimado', async () => {
    await montarTela();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_PRECO), '6,50');
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_LITROS), '100');

    expect(screen.getByText(/650,00/)).toBeTruthy();
  });
});

describe('Novo abastecimento - montagem do payload', () => {
  it('deve omitir os campos opcionais deixados em branco', async () => {
    await montarTela();
    await preencherObrigatorios();

    await enviar();

    await waitFor(() =>
      expect(createAbastecimento).toHaveBeenCalledWith({
        precoPorLitro: 6.39,
        totalLitros: 320,
        quilometragem: 182350,
        tipoCombustivel: 'DIESEL_S10',
        localDescricao: undefined,
        postoIdentificado: undefined,
        observacao: undefined,
      }),
    );
  });




});

describe('Novo abastecimento - modo cadastro', () => {



  it('deve voltar para a tela anterior apos cadastrar', async () => {
    await montarTela();
    await preencherObrigatorios();

    await enviar();

    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

});

describe('Novo abastecimento - modo edicao', () => {

  it('deve consultar o registro informado na rota', async () => {
    await montarEdicao();

    expect(getAbastecimento).toHaveBeenCalledWith(7);
  });

  it('deve preencher o formulario com os dados do registro', async () => {
    await montarEdicao();

    expect(screen.getByDisplayValue('6.39')).toBeTruthy();
    expect(screen.getByDisplayValue('320')).toBeTruthy();
    expect(screen.getByDisplayValue('Posto Rota Norte')).toBeTruthy();
    expect(screen.getByDisplayValue('tanque cheio')).toBeTruthy();
  });



  it('deve salvar a edicao no registro correto, e nao criar outro', async () => {
    await montarEdicao();

    await fireEvent.press(screen.getByText('SALVAR ALTERACOES'));

    await waitFor(() => expect(updateAbastecimento).toHaveBeenCalled());
    expect(jest.mocked(updateAbastecimento).mock.calls[0][0]).toBe(7);
    expect(createAbastecimento).not.toHaveBeenCalled();
  });


  it('deve aplicar a alteracao feita pelo usuario sobre o dado carregado', async () => {
    await montarEdicao();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_LITROS), '400');
    await fireEvent.press(screen.getByText('SALVAR ALTERACOES'));

    await waitFor(() =>
      expect(updateAbastecimento).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ totalLitros: 400 }),
      ),
    );
  });
});

describe('Novo abastecimento - estados de carregamento', () => {

  it('deve bloquear novo envio enquanto o cadastro esta em andamento', async () => {
    jest.mocked(createAbastecimento).mockReturnValue(criarPendencia() as any);
    await montarTela();
    await preencherObrigatorios();

    await enviar();

    await waitFor(() => expect(screen.queryByText('CADASTRAR ABASTECIMENTO')).toBeNull());
    expect(createAbastecimento).toHaveBeenCalledTimes(1);
  });
});

describe('Novo abastecimento - falhas da api', () => {
  const falharCom = (data: unknown) =>
    jest.mocked(createAbastecimento).mockRejectedValue({ response: { data } });

  it('deve exibir a mensagem devolvida pela api', async () => {
    falharCom({ message: 'Você precisa cadastrar um caminhão antes.' });
    await montarTela();
    await preencherObrigatorios();

    await enviar();

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        'Você precisa cadastrar um caminhão antes.',
        expect.objectContaining({ type: 'error' }),
      ),
    );
  });



  it('nao deve navegar de volta quando o cadastro falha', async () => {
    falharCom({ message: 'falhou' });
    await montarTela();
    await preencherObrigatorios();

    await enviar();

    await waitFor(() => expect(Toast.show).toHaveBeenCalled());
    expect(router.back).not.toHaveBeenCalled();
  });

});
