import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react-native';
import React, { ReactNode } from 'react';

import Perfil from '../../../app/perfil';
import DrawerContent from '../drawerContent';
import HomeHeader from '../homeHeader';
import { useAuth } from '@/contexts/authContext';
import { useUser } from '@/hooks/useUser';
import { getMeuCaminhao } from '@/services/caminhaoService';
import { getMeuPerfil } from '@/services/userService';

jest.mock('@/hooks/useUser', () => ({ useUser: jest.fn() }));
jest.mock('@/contexts/authContext', () => ({ useAuth: jest.fn() }));
jest.mock('@/services/caminhaoService', () => ({ getMeuCaminhao: jest.fn() }));
jest.mock('@/services/userService', () => ({ getMeuPerfil: jest.fn(), deleteUser: jest.fn() }));
jest.mock('@/shared/ui/molecules/Toast', () => ({ Toast: { show: jest.fn() } }));
jest.mock('@/utils/queryClient', () => ({ queryClient: { clear: jest.fn() } }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useNavigation: () => ({ dispatch: jest.fn() }),
}));

jest.mock('@react-navigation/drawer', () => {
  const { View } = require('react-native');
  return { DrawerContentScrollView: ({ children }: never) => <View>{children}</View> };
});

const NOME = 'Ana Paula Lima';

beforeEach(() => {
  jest.mocked(useUser).mockReturnValue({ user: { nome: NOME } } as never);
  jest.mocked(useAuth).mockReturnValue({ logout: jest.fn() } as never);
  jest.mocked(getMeuPerfil).mockResolvedValue({ id: 1, nome: NOME } as never);
  jest.mocked(getMeuCaminhao).mockResolvedValue(null);
});

describe('Inicial do usuario - a mesma em todas as telas (#51)', () => {
  it('deve exibir "AL" no cabecalho da tela inicial', async () => {
    await render(<HomeHeader />);

    expect(screen.getByText('AL')).toBeTruthy();
  });

  it('deve exibir "AL" no menu lateral', async () => {
    await render(
      <DrawerContent {...({ navigation: { closeDrawer: jest.fn() } } as any)} />,
    );

    expect(screen.getByText('AL')).toBeTruthy();
  });

  it('deve exibir "AL" na tela de perfil', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    await render(<Perfil />, { wrapper });

    await waitFor(() => expect(screen.getByText('AL')).toBeTruthy());
  });
});
