import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { ReactNode } from 'react';

import EditarDocumento from '../documentos/editar';
import { updateDocumento } from '@/services/documentoService';

// O prefixo `mock` nao e estilo: a fabrica de `jest.mock` e icada para o topo do arquivo e o
// Babel so permite que ela referencie variaveis com esse prefixo. Sem ele, a suite inteira
// falha ao carregar com "not allowed to reference any out-of-scope variables".
const mockMostrarToast = jest.fn();

// A tela usa do axios apenas `isAxiosError`. Importa-lo de verdade aqui derruba o primeiro
// render com "Cannot cancel a stream that already has a reader", vindo dos streams virtuais do
// Expo — falha de ambiente, nao da tela. Dublar so o que e usado evita carregar a biblioteca.
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    isAxiosError: (erro: unknown) =>
      Boolean(erro && typeof erro === 'object' && 'isAxiosError' in erro),
  },
}));

jest.mock('@/services/documentoService', () => ({
  updateDocumento: jest.fn(),
}));

jest.mock('@/shared/ui/molecules/Toast', () => ({
  useToast: () => ({ show: mockMostrarToast }),
}));

jest.mock('@/utils/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const CAMPO_NOME = 'Ex: CRLV, ANTT, Seguro';
const CAMPO_NUMERO = 'Numero do documento';
const CAMPO_OBSERVACAO = 'Observacoes adicionais (opcional)';

const parametros = {
  id: '7',
  nome: 'CRLV 2026',
  numero: 'ABC-123',
  dataEmissao: '2026-03-10T12:00:00.000Z',
  dataVencimento: '2027-03-10T12:00:00.000Z',
  observacao: 'documento do veiculo',
};

const montarTela = async (params: Record<string, unknown> = parametros) => {
  jest.mocked(useLocalSearchParams).mockReturnValue(params as never);

  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );

  return render(<EditarDocumento />, { wrapper });
};

const salvar = async () => fireEvent.press(screen.getByText('SALVAR ALTERAÇÕES'));

beforeEach(() => {
  mockMostrarToast.mockClear();
  jest.mocked(updateDocumento).mockResolvedValue({ id: 7 } as never);
});

describe('Edicao de documento - dados vindos da rota', () => {
  it('deve preencher o formulario com o que veio na navegacao', async () => {
    await montarTela();

    expect(screen.getByDisplayValue('CRLV 2026')).toBeTruthy();
    expect(screen.getByDisplayValue('ABC-123')).toBeTruthy();
    expect(screen.getByDisplayValue('documento do veiculo')).toBeTruthy();
    expect(screen.getByText('10/03/2026')).toBeTruthy();
    expect(screen.getByText('10/03/2027')).toBeTruthy();
  });

  it('deve usar o primeiro valor quando o parametro chega como lista', async () => {
    // O expo-router entrega array quando o mesmo parametro aparece mais de uma vez na URL.
    await montarTela({
      ...parametros,
      nome: ['CRLV 2026', 'ignorado'],
      numero: ['ABC-123'],
      dataEmissao: ['2026-03-10T12:00:00.000Z'],
    });

    expect(screen.getByDisplayValue('CRLV 2026')).toBeTruthy();
    expect(screen.getByDisplayValue('ABC-123')).toBeTruthy();
    expect(screen.getByText('10/03/2026')).toBeTruthy();
  });

  it('deve deixar a data em branco quando o parametro nao e uma data valida', async () => {
    await montarTela({ ...parametros, dataEmissao: 'nao-e-data' });

    expect(screen.getAllByText('DD/MM/AAAA')).toHaveLength(1);
  });

  it('deve deixar os campos vazios quando a navegacao nao traz nada', async () => {
    await montarTela({});

    expect(screen.getByPlaceholderText(CAMPO_NOME).props.value).toBe('');
    expect(screen.getByPlaceholderText(CAMPO_NUMERO).props.value).toBe('');
    expect(screen.getAllByText('DD/MM/AAAA')).toHaveLength(2);
  });
});

describe('Edicao de documento - validacao', () => {
  it.each([
    ['nome em branco', CAMPO_NOME, '   ', 'Nome do documento e obrigatorio'],
    ['numero em branco', CAMPO_NUMERO, '  ', 'Numero e obrigatorio'],
  ])('nao deve salvar com %s', async (_, campo, valor, mensagem) => {
    await montarTela();

    await fireEvent.changeText(screen.getByPlaceholderText(campo), valor);
    await salvar();

    await waitFor(() => expect(screen.getByText(mensagem)).toBeTruthy());
    expect(updateDocumento).not.toHaveBeenCalled();
  });

  it('nao deve salvar sem as datas', async () => {
    await montarTela({ id: '7', nome: 'CRLV', numero: 'ABC-123' });

    await salvar();

    await waitFor(() =>
      expect(screen.getByText('Data de emissao obrigatoria')).toBeTruthy(),
    );
    expect(screen.getByText('Data de vencimento obrigatoria')).toBeTruthy();
    expect(updateDocumento).not.toHaveBeenCalled();
  });

  it('nao deve salvar com vencimento anterior a emissao', async () => {
    await montarTela({
      ...parametros,
      dataEmissao: '2027-03-10T12:00:00.000Z',
      dataVencimento: '2026-03-10T12:00:00.000Z',
    });

    await salvar();

    await waitFor(() =>
      expect(
        screen.getByText('A data de vencimento nao pode ser anterior a emissao'),
      ).toBeTruthy(),
    );
    expect(updateDocumento).not.toHaveBeenCalled();
  });

  it('nao deve salvar quando a navegacao nao informa qual documento editar', async () => {
    // Sem id a tela nao tem o que atualizar. O aviso precisa aparecer, senao o botao parece
    // simplesmente nao funcionar.
    await montarTela({ ...parametros, id: undefined });

    await salvar();

    await waitFor(() =>
      expect(screen.getByText('Documento invalido para edicao')).toBeTruthy(),
    );
    expect(updateDocumento).not.toHaveBeenCalled();
  });
});

describe('Edicao de documento - envio', () => {
  it('deve enviar os dados sem espacos sobrando e com as datas em ISO', async () => {
    await montarTela();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_NOME), '  CRLV 2026  ');
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_NUMERO), ' ABC-123 ');
    await salvar();

    await waitFor(() => expect(updateDocumento).toHaveBeenCalled());

    const [id, enviado] = jest.mocked(updateDocumento).mock.calls[0];
    expect(id).toBe(7);
    expect(enviado).toMatchObject({
      nome: 'CRLV 2026',
      numero: 'ABC-123',
      dataEmissao: '2026-03-10T12:00:00.000Z',
      dataVencimento: '2027-03-10T12:00:00.000Z',
    });
  });

  it('nao deve enviar a observacao apagada como texto vazio', async () => {
    // Apagar a observacao e dizer "nao tem". Mandar `""` gravaria string vazia, que depois
    // aparece como campo preenchido e em branco no cartao do documento.
    await montarTela();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_OBSERVACAO), '   ');
    await salvar();

    await waitFor(() => expect(updateDocumento).toHaveBeenCalled());

    const [, enviado] = jest.mocked(updateDocumento).mock.calls[0];
    expect(enviado.observacao).toBeUndefined();
  });

  it('deve voltar para a tela anterior quando a edicao da certo', async () => {
    await montarTela();
    await salvar();

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(mockMostrarToast).toHaveBeenCalledWith(
      'Documento atualizado com sucesso!',
      expect.anything(),
    );
  });

  it.each([
    [
      'mensagem simples',
      { isAxiosError: true, response: { data: { message: 'Numero ja usado.' } } },
      'Numero ja usado.',
    ],
    [
      'lista de mensagens',
      { isAxiosError: true, response: { data: { message: ['Data invalida.'] } } },
      'Data invalida.',
    ],
    ['erro sem corpo conhecido', new Error('falha de rede'), 'Erro ao atualizar documento'],
  ])('deve exibir %s quando a edicao falha', async (_, erro, esperado) => {
    jest.mocked(updateDocumento).mockRejectedValue(erro as never);

    await montarTela();
    await salvar();

    await waitFor(() =>
      expect(mockMostrarToast).toHaveBeenCalledWith(esperado, expect.anything()),
    );
    expect(router.back).not.toHaveBeenCalled();
  });
});
