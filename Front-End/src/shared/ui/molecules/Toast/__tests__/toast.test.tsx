import { act, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Text } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { Toast, ToastProviderWithViewport } from '../index';

const METRICAS = {
  frame: { x: 0, y: 0, width: 390, height: 844 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

const montar = async () =>
  render(
    <SafeAreaProvider initialMetrics={METRICAS}>
      <ToastProviderWithViewport>
        <Text>conteudo do aplicativo</Text>
      </ToastProviderWithViewport>
    </SafeAreaProvider>,
  );

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('Toast', () => {
  it('deve exibir a mensagem pedida', async () => {
    await montar();

    await act(async () => {
      Toast.show('Documento cadastrado com sucesso!');
    });

    expect(screen.getByText('Documento cadastrado com sucesso!')).toBeTruthy();
  });

  it('deve sumir sozinho depois do tempo padrao', async () => {
    await montar();

    await act(async () => {
      Toast.show('Some sozinho');
    });

    expect(screen.getByText('Some sozinho')).toBeTruthy();

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => expect(screen.queryByText('Some sozinho')).toBeNull());
  });

  it('deve respeitar o tempo que quem chamou pediu', async () => {
    await montar();

    await act(async () => {
      Toast.show('Fica mais tempo', { duration: 10000 });
    });

    await act(async () => {
      jest.advanceTimersByTime(5000);
    });

    expect(screen.getByText('Fica mais tempo')).toBeTruthy();
  });

  it('deve permitir mais de uma mensagem ao mesmo tempo', async () => {
    await montar();

    await act(async () => {
      Toast.show('Primeira');
      Toast.show('Segunda');
    });

    expect(screen.getByText('Primeira')).toBeTruthy();
    expect(screen.getByText('Segunda')).toBeTruthy();
  });

  it('deve encerrar todas as mensagens quando pedido', async () => {
    await montar();

    await act(async () => {
      Toast.show('Primeira');
      Toast.show('Segunda');
    });

    await act(async () => {
      Toast.dismissAll();
    });

    await waitFor(() => expect(screen.queryByText('Primeira')).toBeNull());
    expect(screen.queryByText('Segunda')).toBeNull();
  });
});
