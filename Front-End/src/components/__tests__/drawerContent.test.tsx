import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React from 'react';

import DrawerContent from '../drawerContent';
import { useAuth } from '@/contexts/authContext';
import { useUser } from '@/hooks/useUser';

const mockLogout = jest.fn();

jest.mock('@/contexts/authContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/hooks/useUser', () => ({ useUser: jest.fn() }));

jest.mock('@react-navigation/drawer', () => {
  const { View } = require('react-native');
  return { DrawerContentScrollView: ({ children }: never) => <View>{children}</View> };
});

const fecharGaveta = jest.fn();

const montar = async (user: unknown = { nome: 'Gabriel Silva Souza' }) => {
  jest.mocked(useUser).mockReturnValue({ user } as never);
  jest.mocked(useAuth).mockReturnValue({ logout: mockLogout } as never);

  return render(
    <DrawerContent
      {...({ navigation: { closeDrawer: fecharGaveta } } as never)}
    />,
  );
};

beforeEach(() => {
  mockLogout.mockClear();
  fecharGaveta.mockClear();
});

describe('Menu lateral - identificacao do usuario', () => {
  it('deve exibir o nome de quem esta logado', async () => {
    await montar({ nome: 'Gabriel Silva Souza' });

    expect(screen.getByText('Gabriel Silva Souza')).toBeTruthy();
  });

  it('deve resumir o nome em duas iniciais', async () => {
    await montar({ nome: 'Gabriel Silva Souza' });

    expect(screen.getByText('GS')).toBeTruthy();
  });

  it('deve usar uma inicial quando o nome tem uma palavra so', async () => {
    await montar({ nome: 'gabriel' });

    expect(screen.getByText('G')).toBeTruthy();
  });

  it('deve se virar quando ainda nao sabe quem e o usuario', async () => {
    await montar(null);

    expect(screen.getByText('Usuário')).toBeTruthy();
    expect(screen.getByText('U')).toBeTruthy();
  });
});

describe('Menu lateral - navegacao', () => {
  it.each([
    ['Abastecimentos', '/abastecimentos'],
    ['Calculadora de Frete', '/frete'],
    ['Meu Perfil', '/perfil'],
  ])('deve levar a %s', async (rotulo, destino) => {
    await montar();

    await fireEvent.press(screen.getByText(rotulo));

    expect(fecharGaveta).toHaveBeenCalled();
    await waitFor(() => expect(router.push).toHaveBeenCalledWith(destino));
  });

  it('deve encerrar a sessao pelo menu', async () => {
    await montar();

    await fireEvent.press(screen.getByText('Sair'));

    expect(mockLogout).toHaveBeenCalled();
  });
});
