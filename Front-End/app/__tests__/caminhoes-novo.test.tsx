import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';

import NovoCaminhao from '../caminhoes/novo';
import {
  createCaminhao,
  getMeuCaminhao,
  updateCaminhao,
} from '@/services/caminhaoService';
import { Toast } from '@/shared/ui/molecules/Toast';

jest.mock('@/services/caminhaoService', () => ({
  getMeuCaminhao: jest.fn(),
  createCaminhao: jest.fn(),
  updateCaminhao: jest.fn(),
  scanCaminhao: jest.fn(),
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

jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(),
  launchCameraAsync: jest.fn(),
  launchImageLibraryAsync: jest.fn(),
  MediaTypeOptions: { Images: 'Images' },
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(),
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

const montarTela = async (existente: unknown = null) => {
  jest.mocked(getMeuCaminhao).mockResolvedValue(existente as never);

  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );

  return render(<NovoCaminhao />, { wrapper });
};

const preencherObrigatorios = async (
  placa = 'ABC1D23',
  modelo = 'FH 540',
  renavam = '12345678901',
  eixos = '6',
) => {
  await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_PLACA), placa);
  await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_MODELO), modelo);
  await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_RENAVAM), renavam);
  await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_EIXOS), eixos);
};

const enviar = async (rotulo = 'CADASTRAR CAMINHAO') =>
  fireEvent.press(screen.getByText(rotulo));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(createCaminhao).mockResolvedValue({ message: 'ok' } as never);
  jest.mocked(updateCaminhao).mockResolvedValue({ message: 'ok' } as never);
});

describe('Caminhao - modo cadastro', () => {
  it('deve oferecer o cadastro quando o usuario ainda nao tem caminhao', async () => {
    await montarTela(null);

    await waitFor(() => expect(screen.getByText('CADASTRAR CAMINHAO')).toBeTruthy());
  });

  it('deve enviar os dados normalizados no cadastro', async () => {
    await montarTela(null);
    await waitFor(() => expect(screen.getByText('CADASTRAR CAMINHAO')).toBeTruthy());

    await preencherObrigatorios(' abc1d23 ', '  FH 540  ', '123.456.789-01', '6');
    await enviar();

    await waitFor(() => expect(createCaminhao).toHaveBeenCalled());

    expect(jest.mocked(createCaminhao).mock.calls[0][0]).toMatchObject({
      placa: 'ABC1D23',
      modelo: 'FH 540',
      renavam: '12345678901',
      numeroEixos: 6,
    });
  });

  it('deve voltar para a tela anterior quando o cadastro da certo', async () => {
    await montarTela(null);
    await waitFor(() => expect(screen.getByText('CADASTRAR CAMINHAO')).toBeTruthy());

    await preencherObrigatorios();
    await enviar();

    await waitFor(() => expect(router.back).toHaveBeenCalled());
    expect(Toast.show).toHaveBeenCalledWith(
      'Caminhao cadastrado com sucesso',
      expect.anything(),
    );
  });

  it.each([
    ['mensagem simples', { response: { data: { message: 'Placa ja cadastrada.' } } }, 'Placa ja cadastrada.'],
    ['lista de mensagens', { response: { data: { message: ['Renavam invalido.'] } } }, 'Renavam invalido.'],
    ['erro sem corpo conhecido', new Error('falha de rede'), 'Erro ao cadastrar caminhao'],
  ])('deve exibir %s quando o cadastro falha', async (_, erro, esperado) => {
    jest.mocked(createCaminhao).mockRejectedValue(erro as never);

    await montarTela(null);
    await waitFor(() => expect(screen.getByText('CADASTRAR CAMINHAO')).toBeTruthy());

    await preencherObrigatorios();
    await enviar();

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(esperado, expect.anything()),
    );
    expect(router.back).not.toHaveBeenCalled();
  });
});

describe('Caminhao - campos opcionais', () => {
  it('deve enviar como numero o ano e o numero de eixos', async () => {
    await montarTela(null);
    await waitFor(() => expect(screen.getByText('CADASTRAR CAMINHAO')).toBeTruthy());

    await preencherObrigatorios();
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_ANO), '2020');
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_MARCA), '  Volvo  ');
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_COR), '  Branca  ');
    await enviar();

    await waitFor(() => expect(createCaminhao).toHaveBeenCalled());
    expect(jest.mocked(createCaminhao).mock.calls[0][0]).toMatchObject({
      anoFabricacao: 2020,
      numeroEixos: 6,
      marca: 'Volvo',
      cor: 'Branca',
    });
  });

  it('nao deve deixar o ano passar de quatro digitos', async () => {
    await montarTela(null);
    await waitFor(() => expect(screen.getByText('CADASTRAR CAMINHAO')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_ANO), '20201');

    expect(screen.getByPlaceholderText(CAMPO_ANO).props.value).toBe('2020');
  });

  it('nao deve enviar os opcionais deixados em branco', async () => {
    await montarTela(null);
    await waitFor(() => expect(screen.getByText('CADASTRAR CAMINHAO')).toBeTruthy());

    await preencherObrigatorios();
    await enviar();

    await waitFor(() => expect(createCaminhao).toHaveBeenCalled());
    const enviado = jest.mocked(createCaminhao).mock.calls[0][0] as Record<string, unknown>;

    for (const campo of ['marca', 'cor', 'anoFabricacao', 'crv', 'especieTipo', 'chassi']) {
      expect(enviado[campo]).toBeUndefined();
    }
  });
});

describe('Caminhao - modo edicao', () => {
  it('deve carregar o caminhao existente e oferecer a edicao', async () => {
    await montarTela(caminhaoExistente);

    await waitFor(() => expect(screen.getByDisplayValue('ABC1D23')).toBeTruthy());

    expect(screen.getByText('SALVAR ALTERACOES')).toBeTruthy();
    expect(screen.getByDisplayValue('FH 540')).toBeTruthy();
    expect(screen.getByDisplayValue('12345678901')).toBeTruthy();
    expect(screen.getByDisplayValue('6')).toBeTruthy();
  });

  it('nao deve exibir "null" quando o caminhao vem com campos vazios', async () => {
    await montarTela({
      ...caminhaoExistente,
      marca: null,
      cor: null,
      anoFabricacao: null,
      numeroEixos: null,
    });

    await waitFor(() => expect(screen.getByDisplayValue('ABC1D23')).toBeTruthy());

    expect(screen.getByPlaceholderText(CAMPO_MARCA).props.value).toBe('');
    expect(screen.getByPlaceholderText(CAMPO_COR).props.value).toBe('');
    expect(screen.getByPlaceholderText(CAMPO_ANO).props.value).toBe('');
    expect(screen.getByPlaceholderText(CAMPO_EIXOS).props.value).toBe('');
  });

  it('deve atualizar em vez de cadastrar quando ja existe caminhao', async () => {
    await montarTela(caminhaoExistente);
    await waitFor(() => expect(screen.getByDisplayValue('ABC1D23')).toBeTruthy());

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_MODELO), 'FH 460');
    await enviar('SALVAR ALTERACOES');

    await waitFor(() => expect(updateCaminhao).toHaveBeenCalled());

    expect(createCaminhao).not.toHaveBeenCalled();
    expect(jest.mocked(updateCaminhao).mock.calls[0][0]).toMatchObject({
      modelo: 'FH 460',
    });
  });

  it.each([
    [
      'texto',
      { response: { data: { message: 'Renavam ja usado por outro caminhao.' } } },
      'Renavam ja usado por outro caminhao.',
    ],
    [
      'lista',
      { response: { data: { message: ['Renavam ja usado por outro caminhao.'] } } },
      'Renavam ja usado por outro caminhao.',
    ],
    ['nada', new Error('Network request failed'), 'Erro ao atualizar caminhao'],
  ])('deve exibir o motivo quando a atualizacao falha com %s', async (_, erro, naTela) => {
    jest.mocked(updateCaminhao).mockRejectedValue(erro as never);

    await montarTela(caminhaoExistente);
    await waitFor(() => expect(screen.getByDisplayValue('ABC1D23')).toBeTruthy());

    await enviar('SALVAR ALTERACOES');

    await waitFor(() =>
      expect(Toast.show).toHaveBeenCalledWith(naTela, expect.anything()),
    );
  });
});

describe('Caminhao - validacao do formulario', () => {
  it.each([
    ['placa com menos de sete caracteres', CAMPO_PLACA, 'ABC12'],
    ['modelo em branco', CAMPO_MODELO, '   '],
    ['renavam com menos de nove digitos', CAMPO_RENAVAM, '1234'],
    ['numero de eixos em branco', CAMPO_EIXOS, ''],
    ['numero de eixos abaixo de dois', CAMPO_EIXOS, '1'],
  ])('nao deve enviar com %s', async (_, campo, valor) => {
    await montarTela(null);
    await waitFor(() => expect(screen.getByText('CADASTRAR CAMINHAO')).toBeTruthy());

    await preencherObrigatorios();
    await fireEvent.changeText(screen.getByPlaceholderText(campo), valor);
    await enviar();

    expect(createCaminhao).not.toHaveBeenCalled();
  });

  it('deve apontar na tela qual campo esta errado', async () => {
    await montarTela(null);
    await waitFor(() => expect(screen.getByText('CADASTRAR CAMINHAO')).toBeTruthy());

    await enviar();

    await waitFor(() =>
      expect(screen.getByText('Placa invalida (ex: ABC1234 ou ABC1D23)')).toBeTruthy(),
    );
    expect(screen.getByText('Modelo e obrigatorio')).toBeTruthy();
    expect(screen.getByText('RENAVAM invalido')).toBeTruthy();
    expect(screen.getByText('Numero de eixos e obrigatorio')).toBeTruthy();
  });

  it('deve distinguir eixos em branco de eixos fora da faixa', async () => {
    await montarTela(null);
    await waitFor(() => expect(screen.getByText('CADASTRAR CAMINHAO')).toBeTruthy());

    await preencherObrigatorios();
    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_EIXOS), '1');
    await enviar();

    await waitFor(() =>
      expect(screen.getByText('Informe um numero de eixos valido')).toBeTruthy(),
    );
    expect(screen.queryByText('Numero de eixos e obrigatorio')).toBeNull();
  });
});
