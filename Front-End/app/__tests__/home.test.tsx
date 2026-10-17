import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import Home from '../(drawer)/home';
import { useUser } from '@/hooks/useUser';

jest.mock('@/hooks/useUser', () => ({ useUser: jest.fn() }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
}));

const montar = async (user: unknown = { nome: 'Gabriel Silva Souza' }) => {
  jest.mocked(useUser).mockReturnValue({ user } as never);
  return render(<Home />);
};

describe('Tela inicial - saudacao', () => {
  it('deve chamar o motorista pelo primeiro nome', async () => {
    await montar({ nome: 'Gabriel Silva Souza' });

    expect(screen.getByText('Olá, Gabriel!')).toBeTruthy();
  });

  it('deve saudar sem nome enquanto o perfil nao carregou', async () => {
    await montar(null);

    expect(screen.getByText('Olá, Motorista!')).toBeTruthy();
  });
});

describe('Tela inicial - caminhos para os modulos', () => {
  it.each([
    ['MEU CAMINHÃO', '/perfil'],
    ['MEUS DOCUMENTOS', '/meusDocumentos'],
    ['ABASTECIMENTOS', '/abastecimentos'],
    ['CALCULADORA DE FRETE', '/frete'],
  ])('deve levar de %s para %s', async (cartao, destino) => {
    await montar();

    await fireEvent.press(screen.getByText(cartao));

    expect(router.push).toHaveBeenCalledWith(destino);
  });

  it.todo('deve avisar na tela inicial quando nao ha caminhao cadastrado');
});
