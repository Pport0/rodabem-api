import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';

import NovoDocumento from '../documentos/novo';
import { getMeuCaminhao } from '@/services/caminhaoService';
import { createDocumento } from '@/services/documentoService';
import { Toast } from '@/shared/ui/molecules/Toast';

jest.mock('@/services/caminhaoService', () => ({ getMeuCaminhao: jest.fn() }));

jest.mock('@/services/documentoService', () => ({
  createDocumento: jest.fn(),
  scanDocumento: jest.fn(),
}));

jest.mock('@/shared/ui/molecules/Toast', () => ({
  Toast: { show: jest.fn() },
}));

jest.mock('@/utils/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

/** Parametros da rota. Cada teste ajusta antes de montar; o `beforeEach` limpa. */
const mockParametrosDaRota: Record<string, string> = {};

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockParametrosDaRota,
}));

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-document-picker', () => ({ getDocumentAsync: jest.fn() }));

// O `DateField` abre um seletor nativo, que o ambiente de teste nao dirige. O dublê expoe um
// botao por campo e devolve uma data conhecida, deixando a data controlavel pelo teste. O
// componente real tem cobertura propria, junto com os demais de `src/components`.
/** Data que o dublê devolve para cada campo. O teste ajusta antes de tocar no botao. */
const mockDatas: Record<string, string> = {};

jest.mock('@/components/dateField', () => {
  const { Text, TouchableOpacity } = require('react-native');
  return {
    DateField: ({
      label,
      value,
      onChange,
      error,
    }: {
      label: string;
      value: Date | null;
      onChange: (d: Date) => void;
      error?: string;
    }) => (
      <>
        <TouchableOpacity
          testID={`escolher:${label}`}
          onPress={() => onChange(new Date(mockDatas[label]))}
        >
          <Text>{label}</Text>
        </TouchableOpacity>
        {error ? <Text>{error}</Text> : null}
      </>
    ),
  };
});

const CAMPO_NOME = 'Ex: CRLV, CNH, Seguro';
const CAMPO_NUMERO = 'Numero do documento';
const CAMPO_OBSERVACAO = 'Observacoes adicionais (opcional)';
const EMISSAO = 'escolher:DATA DE EMISSAO *';
const VENCIMENTO = 'escolher:DATA DE VENCIMENTO *';

const montarTela = async (caminhao: unknown = null) => {
  jest.mocked(getMeuCaminhao).mockResolvedValue(caminhao as never);

  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );

  return render(<NovoDocumento />, { wrapper });
};

/** Preenche nome, numero e as duas datas com valores validos. */
const preencherObrigatorios = async () => {
  await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_NOME), 'CRLV 2026');
  await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_NUMERO), 'ABC-123');
  await fireEvent.press(screen.getByTestId(EMISSAO));
  await fireEvent.press(screen.getByTestId(VENCIMENTO));
};

const cadastrar = async () => fireEvent.press(screen.getByText('CADASTRAR DOCUMENTO'));

const EMISSAO_PADRAO = '2026-03-10T12:00:00.000Z';
const VENCIMENTO_PADRAO = '2027-03-10T12:00:00.000Z';

beforeEach(() => {
  for (const chave of Object.keys(mockParametrosDaRota)) delete mockParametrosDaRota[chave];
  jest.mocked(createDocumento).mockResolvedValue({ id: 1 } as never);
  mockDatas['DATA DE EMISSAO *'] = EMISSAO_PADRAO;
  mockDatas['DATA DE VENCIMENTO *'] = VENCIMENTO_PADRAO;
});

describe('Cadastro de documento - validacao', () => {
  it('deve apontar todos os campos obrigatorios quando nada foi preenchido', async () => {
    await montarTela();

    await cadastrar();

    await waitFor(() =>
      expect(screen.getByText('Nome do documento e obrigatorio')).toBeTruthy(),
    );
    expect(screen.getByText('Numero e obrigatorio')).toBeTruthy();
    expect(screen.getByText('Data de emissao obrigatoria')).toBeTruthy();
    expect(screen.getByText('Data de vencimento obrigatoria')).toBeTruthy();
    expect(createDocumento).not.toHaveBeenCalled();
  });

  it('nao deve cadastrar com vencimento anterior a emissao', async () => {
    mockDatas['DATA DE VENCIMENTO *'] = '2025-03-10T12:00:00.000Z';

    await montarTela();
    await preencherObrigatorios();
    await cadastrar();

    await waitFor(() =>
      expect(
        screen.getByText('A data de vencimento nao pode ser anterior a emissao'),
      ).toBeTruthy(),
    );
    expect(createDocumento).not.toHaveBeenCalled();
  });
});

describe('Cadastro de documento - envio', () => {
  it('deve enviar os dados sem espacos sobrando e com as datas em ISO', async () => {
    await montarTela();

    await preencherObrigatorios();
    await fireEvent.changeText(
      screen.getByPlaceholderText(CAMPO_OBSERVACAO),
      '  copia digital  ',
    );
    await cadastrar();

    await waitFor(() => expect(createDocumento).toHaveBeenCalled());

    expect(jest.mocked(createDocumento).mock.calls[0][0]).toMatchObject({
      nome: 'CRLV 2026',
      numero: 'ABC-123',
      dataEmissao: '2026-03-10T12:00:00.000Z',
      dataVencimento: '2027-03-10T12:00:00.000Z',
      observacao: 'copia digital',
    });
  });

  it('deve omitir a observacao quando o usuario nao escreve nada', async () => {
    await montarTela();

    await preencherObrigatorios();
    await cadastrar();

    await waitFor(() => expect(createDocumento).toHaveBeenCalled());

    expect(jest.mocked(createDocumento).mock.calls[0][0].observacao).toBeUndefined();
  });

  it('deve voltar para a tela anterior quando o cadastro da certo', async () => {
    await montarTela();

    await preencherObrigatorios();
    await cadastrar();

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(Toast.show).toHaveBeenCalledWith(
      'Documento cadastrado com sucesso!',
      expect.anything(),
    );
  });

  it.each([
    ['mensagem simples', { response: { data: { message: 'Numero ja usado.' } } }, 'Numero ja usado.'],
    ['lista de mensagens', { response: { data: { message: ['Data invalida.'] } } }, 'Data invalida.'],
    ['erro sem corpo conhecido', new Error('falha de rede'), 'Erro ao cadastrar documento'],
  ])('deve exibir %s quando o cadastro falha', async (_, erro, esperado) => {
    jest.mocked(createDocumento).mockRejectedValue(erro as never);

    await montarTela();
    await preencherObrigatorios();
    await cadastrar();

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(esperado, expect.anything()),
    );
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('Cadastro de documento - vinculo com o caminhao', () => {
  // RNE-05: todo documento pertence ao usuario, e o vinculo com o caminhao e opcional. Quando
  // ha vinculo e documento do veiculo; sem vinculo, do motorista.
  it('deve vincular ao caminhao quando o usuario tem um cadastrado', async () => {
    await montarTela({ id: 42, placa: 'ABC1D23' });

    await waitFor(() => expect(getMeuCaminhao).toHaveBeenCalled());
    await preencherObrigatorios();
    await cadastrar();

    await waitFor(() => expect(createDocumento).toHaveBeenCalled());

    expect(jest.mocked(createDocumento).mock.calls[0][0].caminhaoId).toBe(42);
  });

  it('deve registrar como documento do motorista quando o vinculo e desligado', async () => {
    await montarTela({ id: 42, placa: 'ABC1D23' });

    await waitFor(() => expect(getMeuCaminhao).toHaveBeenCalled());

    const [vinculo] = await waitFor(() => screen.getAllByRole('switch'));
    await fireEvent(vinculo, 'valueChange', false);

    await preencherObrigatorios();
    await cadastrar();

    await waitFor(() => expect(createDocumento).toHaveBeenCalled());

    expect(jest.mocked(createDocumento).mock.calls[0][0].caminhaoId).toBeUndefined();
  });

  it('deve vincular ao caminhao que a rota indica, e nao ao caminhao do usuario', async () => {
    // Chega-se a esta tela pela listagem de um caminhao especifico. O caminhao da rota manda:
    // usar o do usuario anexaria o documento ao veiculo errado.
    mockParametrosDaRota.caminhaoId = '7';

    await montarTela({ id: 42, placa: 'ABC1D23' });

    await preencherObrigatorios();
    await cadastrar();

    await waitFor(() => expect(createDocumento).toHaveBeenCalled());

    expect(jest.mocked(createDocumento).mock.calls[0][0].caminhaoId).toBe(7);
  });

  it('deve deixar claro que o vinculo ja esta decidido quando a rota traz o caminhao', async () => {
    // Com o caminhao escolhido na tela anterior, o texto generico "entra no contexto do
    // caminhao atual" deixaria duvida sobre qual veiculo vai receber o documento.
    mockParametrosDaRota.caminhaoId = '7';

    await montarTela({ id: 42, placa: 'ABC1D23' });

    await waitFor(() =>
      expect(
        screen.getByText('Este documento sera vinculado ao caminhão selecionado.'),
      ).toBeTruthy(),
    );
  });

  it('deve explicar o vinculo em aberto quando a rota nao traz caminhao', async () => {
    await montarTela({ id: 42, placa: 'ABC1D23' });

    await waitFor(() =>
      expect(
        screen.getByText('Se ligado, o documento entra no contexto do caminhão atual.'),
      ).toBeTruthy(),
    );
  });

  it('nao deve vincular quando o usuario nao tem caminhao', async () => {
    await montarTela(null);

    await preencherObrigatorios();
    await cadastrar();

    await waitFor(() => expect(createDocumento).toHaveBeenCalled());

    expect(jest.mocked(createDocumento).mock.calls[0][0].caminhaoId).toBeUndefined();
  });
});
