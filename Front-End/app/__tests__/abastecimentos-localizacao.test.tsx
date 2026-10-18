import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import React, { ReactNode } from 'react';

import NovoAbastecimento from '../abastecimentos/novo';
import {
  createAbastecimento,
  getAbastecimento,
  updateAbastecimento,
} from '@/services/abastecimentoService';

jest.mock('@/services/abastecimentoService', () => ({
  getAbastecimento: jest.fn(),
  createAbastecimento: jest.fn(),
  updateAbastecimento: jest.fn(),
}));

jest.mock('@/shared/ui/molecules/Toast', () => ({ Toast: { show: jest.fn() } }));
jest.mock('@/utils/queryClient', () => ({ queryClient: { invalidateQueries: jest.fn() } }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

const POSICAO = { coords: { latitude: -16.3281, longitude: -48.9534 } };

const montarTela = async () => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  return render(<NovoAbastecimento />, { wrapper });
};

const preencherESalvar = async () => {
  await fireEvent.changeText(screen.getByPlaceholderText('Ex: 6.39'), '6,39');
  await fireEvent.changeText(screen.getByPlaceholderText('Ex: 320'), '320');
  await fireEvent.changeText(screen.getByPlaceholderText('Ex: 182350'), '182350');
  await fireEvent.press(screen.getByText('CADASTRAR ABASTECIMENTO'));
};

beforeEach(() => {
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(createAbastecimento).mockResolvedValue({ id: 1 } as any);
  jest.mocked(updateAbastecimento).mockResolvedValue({ id: 7 } as any);
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ granted: true } as any);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue(POSICAO as any);
});

describe('Novo abastecimento - localizacao do aparelho (#30)', () => {
  it('deve enviar latitude e longitude quando o motorista autoriza a localizacao', async () => {
    await montarTela();
    await screen.findByText('Localização registrada com o abastecimento.');

    await preencherESalvar();

    await waitFor(() =>
      expect(createAbastecimento).toHaveBeenCalledWith(
        expect.objectContaining({ latitude: -16.3281, longitude: -48.9534 }),
      ),
    );
  });

  it('deve salvar sem localizacao quando o motorista recusa a permissao', async () => {
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ granted: false } as any);

    await montarTela();
    await screen.findByText('Localização não autorizada. O abastecimento será salvo sem ela.');

    await preencherESalvar();

    await waitFor(() => expect(createAbastecimento).toHaveBeenCalled());
    const enviado = jest.mocked(createAbastecimento).mock.calls[0][0];
    expect(enviado).not.toHaveProperty('latitude');
    expect(enviado).not.toHaveProperty('longitude');
    expect(Location.getCurrentPositionAsync).not.toHaveBeenCalled();
  });

  it('deve salvar sem localizacao quando o GPS falha', async () => {
    jest.mocked(Location.getCurrentPositionAsync).mockRejectedValue(new Error('GPS desligado'));

    await montarTela();
    await screen.findByText('Localização indisponível. O abastecimento será salvo sem ela.');

    await preencherESalvar();

    await waitFor(() => expect(createAbastecimento).toHaveBeenCalled());
    expect(jest.mocked(createAbastecimento).mock.calls[0][0]).not.toHaveProperty('latitude');
  });

  it('deve manter o posto digitado a mao junto com a localizacao', async () => {
    await montarTela();
    await screen.findByText('Localização registrada com o abastecimento.');

    await fireEvent.changeText(screen.getByPlaceholderText('Ex: Posto Rota Norte'), 'Posto Rota Norte');
    await preencherESalvar();

    await waitFor(() =>
      expect(createAbastecimento).toHaveBeenCalledWith(
        expect.objectContaining({ postoIdentificado: 'Posto Rota Norte', latitude: -16.3281 }),
      ),
    );
  });

  it('nao deve pedir localizacao nem alterar a posicao ao editar um abastecimento', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: '7' });
    jest.mocked(getAbastecimento).mockResolvedValue({
      id: 7,
      precoPorLitro: 6.39,
      totalLitros: 320,
      quilometragem: 182350,
      tipoCombustivel: 'DIESEL_S10',
    } as any);

    await montarTela();
    await waitFor(() => expect(screen.getByDisplayValue('182350')).toBeTruthy());
    await fireEvent.press(screen.getByText('SALVAR ALTERACOES'));

    await waitFor(() => expect(updateAbastecimento).toHaveBeenCalled());
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(jest.mocked(updateAbastecimento).mock.calls[0][1]).not.toHaveProperty('latitude');
  });
});
