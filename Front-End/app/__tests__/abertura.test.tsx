import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import ForgotPassword from '../forgotPassword';
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

describe('Recuperacao de senha', () => {
  it('hoje a tela nao faz nada alem de exibir um titulo', async () => {
    await render(<ForgotPassword />);

    expect(screen.getByText('Esqueci minha senha')).toBeTruthy();
  });

  it.todo('deve pedir o e-mail do usuario');
  it.todo('deve enviar um link ou codigo de uso unico, com prazo de validade');
  it.todo('deve permitir definir nova senha sem exigir a anterior');
  it.todo('nao deve revelar se o e-mail informado existe na base');
});
