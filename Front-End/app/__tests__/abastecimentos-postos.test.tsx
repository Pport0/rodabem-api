import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import * as Location from 'expo-location';
import { useLocalSearchParams } from 'expo-router';
import React, { ReactNode } from 'react';

import NovoAbastecimento from '../abastecimentos/novo';
import {
  createAbastecimento,
  getAbastecimento,
  getPostosProximos,
  updateAbastecimento,
} from '@/services/abastecimentoService';

jest.mock('@/services/abastecimentoService', () => ({
  getAbastecimento: jest.fn(),
  createAbastecimento: jest.fn(),
  updateAbastecimento: jest.fn(),
  getPostosProximos: jest.fn(),
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

const POSICAO = { coords: { latitude: -16.3281, longitude: -48.9526 } };
const CAMPO_POSTO = 'Ex: Posto Rota Norte';

const POSTOS = {
  postos: [
    { nome: 'Carrefour Posto Anápolis', distanciaMetros: 652 },
    { nome: 'Petrobrás', distanciaMetros: 857 },
  ],
  mensagem: null,
};

const montarTela = async () => {
  const cliente = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={cliente}>{children}</QueryClientProvider>
  );
  return render(<NovoAbastecimento />, { wrapper });
};

const preencherObrigatoriosESalvar = async () => {
  await fireEvent.changeText(screen.getByPlaceholderText('Ex: 6,39'), '6,39');
  await fireEvent.changeText(screen.getByPlaceholderText('Ex: 320'), '320');
  await fireEvent.changeText(screen.getByPlaceholderText('Ex: 182350'), '182350');
  await fireEvent.press(screen.getByText('CADASTRAR ABASTECIMENTO'));
};

beforeEach(() => {
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(createAbastecimento).mockResolvedValue({ id: 1 } as any);
  jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ granted: true } as any);
  jest.mocked(Location.getCurrentPositionAsync).mockResolvedValue(POSICAO as any);
  jest.mocked(getPostosProximos).mockResolvedValue(POSTOS);
});

describe('Novo abastecimento - posto sugerido pela localizacao (#30)', () => {
  it('deve buscar os postos pela posicao do aparelho', async () => {
    await montarTela();

    await waitFor(() =>
      expect(getPostosProximos).toHaveBeenCalledWith({ latitude: -16.3281, longitude: -48.9526 }),
    );
  });

  it('deve mostrar os postos proximos com a distancia em metros', async () => {
    await montarTela();

    expect(await screen.findByText('Carrefour Posto Anápolis · 652 m')).toBeTruthy();
    expect(screen.getByText('Petrobrás · 857 m')).toBeTruthy();
  });

  it('deve preencher o campo ao tocar num posto, sem salvar sozinho', async () => {
    await montarTela();

    await fireEvent.press(await screen.findByText('Petrobrás · 857 m'));

    expect(screen.getByPlaceholderText(CAMPO_POSTO).props.value).toBe('Petrobrás');
    expect(createAbastecimento).not.toHaveBeenCalled();
  });

  it('deve deixar corrigir o posto sugerido e salvar o nome corrigido', async () => {
    await montarTela();
    await fireEvent.press(await screen.findByText('Petrobrás · 857 m'));

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_POSTO), 'Petrobrás BR-060');
    await preencherObrigatoriosESalvar();

    await waitFor(() => expect(createAbastecimento).toHaveBeenCalled());
    expect(jest.mocked(createAbastecimento).mock.calls[0][0]).toMatchObject({
      postoIdentificado: 'Petrobrás BR-060',
      latitude: -16.3281,
      longitude: -48.9526,
    });
  });

  it('deve avisar quando nao ha postos por perto e manter o campo manual', async () => {
    jest
      .mocked(getPostosProximos)
      .mockResolvedValue({ postos: [], mensagem: 'Nenhum posto encontrado por perto.' });

    await montarTela();

    expect(await screen.findByText('Nenhum posto encontrado por perto.')).toBeTruthy();
    expect(screen.queryByText(/toque para preencher/)).toBeNull();
    expect(screen.getByPlaceholderText(CAMPO_POSTO).props.editable).not.toBe(false);
  });

  it('deve mostrar a mensagem do servidor quando o mapa falha', async () => {
    jest
      .mocked(getPostosProximos)
      .mockResolvedValue({ postos: [], mensagem: 'Não foi possível buscar postos próximos agora.' });

    await montarTela();

    expect(await screen.findByText('Não foi possível buscar postos próximos agora.')).toBeTruthy();
  });

  it('nao deve buscar postos quando a localizacao e recusada', async () => {
    jest.mocked(Location.requestForegroundPermissionsAsync).mockResolvedValue({ granted: false } as any);

    await montarTela();

    await screen.findByText('Localização não autorizada. O abastecimento será salvo sem ela.');
    expect(getPostosProximos).not.toHaveBeenCalled();
  });

  it('nao deve buscar postos quando o GPS falha', async () => {
    jest.mocked(Location.getCurrentPositionAsync).mockRejectedValue(new Error('GPS desligado'));

    await montarTela();

    await screen.findByText('Localização indisponível. O abastecimento será salvo sem ela.');
    expect(getPostosProximos).not.toHaveBeenCalled();
  });

  it('deve seguir com o cadastro manual quando a busca de postos da erro', async () => {
    jest.mocked(getPostosProximos).mockRejectedValue(new Error('Network Error'));

    await montarTela();
    expect(await screen.findByText('Não foi possível buscar postos próximos agora.')).toBeTruthy();

    await fireEvent.changeText(screen.getByPlaceholderText(CAMPO_POSTO), 'Posto Rota Norte');
    await preencherObrigatoriosESalvar();

    await waitFor(() => expect(createAbastecimento).toHaveBeenCalled());
    expect(jest.mocked(createAbastecimento).mock.calls[0][0]).toMatchObject({
      postoIdentificado: 'Posto Rota Norte',
    });
  });

  it('nao deve pedir localizacao nem sugerir postos na edicao', async () => {
    jest.mocked(useLocalSearchParams).mockReturnValue({ id: '7' });
    jest.mocked(getAbastecimento).mockResolvedValue({
      id: 7,
      precoPorLitro: 6.39,
      totalLitros: 320,
      quilometragem: 182350,
      tipoCombustivel: 'DIESEL_S10',
      postoIdentificado: 'Posto Antigo',
    } as any);

    await montarTela();

    await waitFor(() => expect(screen.getByDisplayValue('Posto Antigo')).toBeTruthy());
    expect(Location.requestForegroundPermissionsAsync).not.toHaveBeenCalled();
    expect(getPostosProximos).not.toHaveBeenCalled();
  });
});
