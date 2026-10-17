import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';
import { Alert } from 'react-native';

import EditarCaminhao from '../caminhoes/editar';
import {
  deleteCaminhao,
  getMeuCaminhao,
  updateCaminhao,
} from '@/services/caminhaoService';
import { Toast } from '@/shared/ui/molecules/Toast';

jest.mock('@/services/caminhaoService', () => ({
  getMeuCaminhao: jest.fn(),
  updateCaminhao: jest.fn(),
  deleteCaminhao: jest.fn(),
}));

jest.mock('@/shared/ui/molecules/Toast', () => ({
  Toast: { show: jest.fn() },
}));

jest.mock('@/utils/queryClient', () => ({
  queryClient: { invalidateQueries: jest.fn() },
}));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const CAMPO_PLACA = 'ABC1234 ou ABC1D23';
const CAMPO_MODELO = 'Ex: Scania R450';
const CAMPO_RENAVAM = '00000000000';
const CAMPO_EIXOS = 'Ex: 6';
const CAMPO_MARCA = 'Ex: Scania, Volvo, Mercedes';
const CAMPO_COR = 'Ex: Branco, Vermelho';
const CAMPO_ANO = 'Ex: 2022';

const caminhaoExistente = {
  id: 3,
  placa: 'ABC1D23',
  modelo: 'FH 540',
  renavam: '12345678901',
  marca: 'Volvo',
  cor: 'BRANCA',
  anoFabricacao: 2020,
  numeroEixos: 6,
  userId: 1,
};

const montarTela = async (caminhao: unknown = caminhaoExistente) => {
  jest.mocked(getMeuCaminhao).mockResolvedValue(caminhao as never);

  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );

  return render(<EditarCaminhao />, { wrapper });
};

const montarComDados = async () => {
  await montarTela();
  await waitFor(() => expect(screen.getByDisplayValue('ABC1D23')).toBeTruthy());
};

const salvar = async () => fireEvent.press(screen.getByText('SALVAR ALTERAÇÕES'));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(updateCaminhao).mockResolvedValue({ message: 'ok' } as never);
  jest.mocked(deleteCaminhao).mockResolvedValue({ message: 'ok' } as never);
});

describe('Edicao de caminhao - carregamento', () => {
  it('deve preencher o formulario com os dados do caminhao cadastrado', async () => {
    await montarComDados();

    expect(screen.getByDisplayValue('FH 540')).toBeTruthy();
    expect(screen.getByDisplayValue('12345678901')).toBeTruthy();
    expect(screen.getByDisplayValue('Volvo')).toBeTruthy();
    expect(screen.getByDisplayValue('BRANCA')).toBeTruthy();
    expect(screen.getByDisplayValue('2020')).toBeTruthy();
    expect(screen.getByDisplayValue('6')).toBeTruthy();
  });

  it('deve avisar quando nao ha caminhao para editar', async () => {
    await montarTela(null);

    await waitFor(() =>
      expect(screen.getByText('Nenhum caminhao cadastrado para edicao.')).toBeTruthy(),
    );
  });

  it('nao deve exibir "null" quando o caminhao vem com campos vazios', async () => {
    await montarTela({
      ...caminhaoExistente,
      placa: null,
      modelo: null,
      renavam: null,
      numeroEixos: null,
    });

    await waitFor(() => expect(screen.getByPlaceholderText(CAMPO_PLACA)).toBeTruthy());

    expect(screen.getByPlaceholderText(CAMPO_PLACA).props.value).toBe('');
    expect(screen.getByPlaceholderText(CAMPO_MODELO).props.value).toBe('');
    expect(screen.getByPlaceholderText(CAMPO_RENAVAM).props.value).toBe('');
    expect(screen.getByPlaceholderText(CAMPO_EIXOS).props.value).toBe('');
  });

  it('deve deixar vazios os campos opcionais que o caminhao nao tem', async () => {
    await montarTela({
      ...caminhaoExistente,
      marca: null,
      cor: null,
      anoFabricacao: null,
    });

    await waitFor(() => expect(screen.getByDisplayValue('ABC1D23')).toBeTruthy());

    expect(screen.getByPlaceholderText(CAMPO_MARCA).props.value).toBe('');
    expect(screen.getByPlaceholderText(CAMPO_COR).props.value).toBe('');
    expect(screen.getByPlaceholderText(CAMPO_ANO).props.value).toBe('');
  });
});

describe('Edicao de caminhao - validacao', () => {
  it.each([
    ['placa com menos de sete caracteres', CAMPO_PLACA, 'ABC12'],
    ['modelo em branco', CAMPO_MODELO, '   '],
    ['renavam com menos de nove digitos', CAMPO_RENAVAM, '1234'],
    ['numero de eixos em branco', CAMPO_EIXOS, ''],
    ['numero de eixos abaixo de dois', CAMPO_EIXOS, '1'],
  ])('nao deve salvar com %s', async (_, campo, valor) => {
    await montarComDados();

    await fireEvent.changeText(screen.getByPlaceholderText(campo), valor);
    await salvar();

    expect(updateCaminhao).not.toHaveBeenCalled();
  });

  it('deve apontar na tela qual campo esta errado', async () => {
    await montarComDados();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_PLACA), 'ABC12');
    await salvar();

    await waitFor(() =>
      expect(screen.getByText('Placa invalida (ex: ABC1234 ou ABC1D23)')).toBeTruthy(),
    );
  });

  it('deve distinguir eixos em branco de eixos fora da faixa', async () => {
    await montarComDados();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_EIXOS), '1');
    await salvar();

    await waitFor(() =>
      expect(screen.getByText('Informe um numero de eixos valido')).toBeTruthy(),
    );
    expect(screen.queryByText('Numero de eixos e obrigatorio')).toBeNull();
  });
});

describe('Edicao de caminhao - envio', () => {
  it('deve normalizar os dados antes de enviar', async () => {
    await montarComDados();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_PLACA), ' abc1d23 ');
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_MODELO), '  FH 540  ');
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_RENAVAM), '123.456.789-01');
    await salvar();

    await waitFor(() => expect(updateCaminhao).toHaveBeenCalled());

    expect(jest.mocked(updateCaminhao).mock.calls[0][0]).toMatchObject({
      placa: 'ABC1D23',
      modelo: 'FH 540',
      renavam: '12345678901',
      numeroEixos: 6,
    });
  });

  it('deve omitir os campos opcionais deixados em branco', async () => {
    await montarComDados();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_MARCA), '  ');
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_COR), '');
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_ANO), '');
    await salvar();

    await waitFor(() => expect(updateCaminhao).toHaveBeenCalled());

    const enviado = jest.mocked(updateCaminhao).mock.calls[0][0];
    expect(enviado.marca).toBeUndefined();
    expect(enviado.cor).toBeUndefined();
    expect(enviado.anoFabricacao).toBeUndefined();
  });

  it('deve voltar para a tela anterior quando a edicao da certo', async () => {
    await montarComDados();
    await salvar();

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(Toast.show).toHaveBeenCalledWith(
      'Caminhao atualizado com sucesso',
      expect.anything(),
    );
  });

  it.each([
    ['mensagem simples', { response: { data: { message: 'Placa ja cadastrada.' } } }, 'Placa ja cadastrada.'],
    ['lista de mensagens', { response: { data: { message: ['Renavam invalido.'] } } }, 'Renavam invalido.'],
    ['erro sem corpo conhecido', new Error('falha de rede'), 'Ocorreu um erro inesperado. Tente novamente.'],
    ['resposta sem mensagem', { response: { data: {} } }, 'Ocorreu um erro inesperado. Tente novamente.'],
  ])('deve exibir %s devolvida pelo servidor', async (_, erro, esperado) => {
    jest.mocked(updateCaminhao).mockRejectedValue(erro as never);

    await montarComDados();
    await salvar();

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(esperado, expect.anything()),
    );
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('Edicao de caminhao - exclusao', () => {
  const pedirExclusao = async () => {
    const alerta = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    await fireEvent.press(screen.getByText('EXCLUIR CAMINHÃO'));

    const botoes = alerta.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    alerta.mockRestore();
    return botoes;
  };

  it('deve pedir confirmacao antes de excluir', async () => {
    await montarComDados();

    const botoes = await pedirExclusao();

    expect(botoes.map((b) => b.text)).toEqual(['Cancelar', 'Excluir']);
    expect(deleteCaminhao).not.toHaveBeenCalled();
  });

  it('nao deve excluir quando o usuario cancela', async () => {
    await montarComDados();

    const [cancelar] = await pedirExclusao();
    cancelar.onPress?.();

    expect(deleteCaminhao).not.toHaveBeenCalled();
  });

  it('deve excluir e voltar quando o usuario confirma', async () => {
    await montarComDados();

    const [, excluir] = await pedirExclusao();
    excluir.onPress?.();

    await waitFor(() => expect(deleteCaminhao).toHaveBeenCalled());
    await waitFor(() => expect(router.back).toHaveBeenCalled());
  });

  it('deve sinalizar que a exclusao esta em andamento', async () => {
    let liberar: (valor: unknown) => void = () => {};
    jest
      .mocked(deleteCaminhao)
      .mockReturnValue(new Promise((resolve) => (liberar = resolve)) as never);

    await montarComDados();

    const [, excluir] = await pedirExclusao();
    excluir.onPress?.();

    await waitFor(() => expect(screen.queryByText('EXCLUIR CAMINHÃO')).toBeNull());

    liberar({ message: 'ok' });
    await waitFor(() => expect(deleteCaminhao).toHaveBeenCalled());
  });

  it('deve exibir o motivo quando a exclusao e recusada', async () => {
    jest.mocked(deleteCaminhao).mockRejectedValue({
      response: { data: { message: 'Caminhao possui abastecimentos vinculados.' } },
    } as never);

    await montarComDados();

    const [, excluir] = await pedirExclusao();
    excluir.onPress?.();

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(
        'Caminhao possui abastecimentos vinculados.',
        expect.anything(),
      ),
    );
  });
});
