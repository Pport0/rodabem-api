import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { ReactNode } from 'react';

import { AuthProvider, useAuth } from '../authContext';
import { signOut } from '@/services/authService';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: () => ({
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    }),
    isAxiosError: (e: unknown) => Boolean(e && typeof e === 'object' && 'isAxiosError' in e),
  },
}));

jest.mock('@/services/authService', () => ({ signIn: jest.fn(), signOut: jest.fn() }));
jest.mock('@/services/userService', () => ({ createUser: jest.fn() }));
jest.mock('@/shared/ui/molecules/Toast', () => ({
  useToast: () => ({ show: jest.fn() }),
}));

const CHAVE_TOKEN = process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token';
const CHAVE_USUARIO = process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user';
const memoria: Map<string, string> = (SecureStore as any).__memoria;

const montarAuth = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: 0 }, queries: { retry: false, gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
    </QueryClientProvider>
  );

  return renderHook(() => useAuth(), { wrapper });
};

const sair = async (logout: () => void) => {
  await act(async () => {
    await logout();
  });
};

beforeEach(() => {
  memoria.set(CHAVE_TOKEN, 'jwt-token');
  memoria.set(CHAVE_USUARIO, JSON.stringify({ id: 1, nome: 'Gabriel' }));
});

describe('authContext - logout no servidor', () => {
  it('deve avisar o servidor enquanto o token ainda esta gravado', async () => {
    let tokenNaChamada: string | undefined;
    jest.mocked(signOut).mockImplementation(async () => {
      tokenNaChamada = memoria.get(CHAVE_TOKEN);
    });
    const { result } = await montarAuth();

    await sair(result.current.logout);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(tokenNaChamada).toBe('jwt-token');
  });

  it('deve apagar token e usuario depois que o servidor responde', async () => {
    jest.mocked(signOut).mockResolvedValue(undefined);
    const { result } = await montarAuth();

    await sair(result.current.logout);

    expect(memoria.has(CHAVE_TOKEN)).toBe(false);
    expect(memoria.has(CHAVE_USUARIO)).toBe(false);
    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('deve encerrar a sessao local mesmo quando a chamada ao servidor falha', async () => {
    jest.mocked(signOut).mockRejectedValue(new Error('Network Error'));
    const { result } = await montarAuth();

    await sair(result.current.logout);

    expect(signOut).toHaveBeenCalledTimes(1);
    expect(memoria.has(CHAVE_TOKEN)).toBe(false);
    expect(memoria.has(CHAVE_USUARIO)).toBe(false);
    expect(router.replace).toHaveBeenCalledWith('/');
  });
});
