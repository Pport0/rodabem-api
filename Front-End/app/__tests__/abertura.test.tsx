import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import Index from '../index';
import NotFoundScreen from '../+not-found';

jest.mock('expo-router', () => {
  const { Text } = require('react-native');
  return {
    router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
    Link: ({ href, children }: { href: string; children: React.ReactNode }) => (
      <Text accessibilityHint={href}>{children}</Text>
    ),
    Stack: { Screen: () => null },
  };
});

describe('Tela de abertura', () => {
  it('deve oferecer os dois caminhos de entrada', async () => {
    await render(<Index />);

    expect(screen.getByText('ENTRAR')).toBeTruthy();
    expect(screen.getByText('CRIAR CONTA')).toBeTruthy();
  });

  it.each([
    ['ENTRAR', '/login'],
    ['CRIAR CONTA', '/register'],
  ])('deve levar de %s para %s', async (botao, destino) => {
    await render(<Index />);

    await fireEvent.press(screen.getByText(botao));

    expect(router.push).toHaveBeenCalledWith(destino);
  });
});

describe('Rota inexistente', () => {
  it('deve avisar que a tela nao existe e oferecer a volta', async () => {
    await render(<NotFoundScreen />);

    expect(screen.getByText('Esta tela não existe.')).toBeTruthy();
    expect(screen.getByText('Voltar para o início')).toBeTruthy();
  });
});
