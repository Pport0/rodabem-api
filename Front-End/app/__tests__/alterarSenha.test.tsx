import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { ReactNode } from 'react';

import AlterarSenha from '../alterarSenha';
import { signOut } from '@/services/authService';
import { alterarSenha } from '@/services/userService';
import { queryClient as queryClientCompartilhado } from '@/utils/queryClient';

jest.mock('@/services/userService', () => ({ alterarSenha: jest.fn() }));
jest.mock('@/services/authService', () => ({ signIn: jest.fn(), signOut: jest.fn() }));
jest.mock('@/utils/queryClient', () => ({ queryClient: { clear: jest.fn() } }));

const mockMostrarToast = jest.fn();
jest.mock('@/shared/ui/molecules/Toast', () => ({
  useToast: () => ({ show: mockMostrarToast }),
}));

const CHAVE_TOKEN = process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token';
const CHAVE_USUARIO = process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user';
const memoria: Map<string, string> = (SecureStore as any).__memoria;

const renderizar = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  await render(<AlterarSenha />, { wrapper });
};

const preencherESalvar = async () => {
  await fireEvent.changeText(screen.getByPlaceholderText('Digite sua senha atual'), 'senhaAntiga');
  await fireEvent.changeText(screen.getByPlaceholderText('Digite a nova senha'), 'senhaNova123');
  await fireEvent.changeText(screen.getByPlaceholderText('Confirme a nova senha'), 'senhaNova123');
  await fireEvent.press(screen.getByText('SALVAR NOVA SENHA'));
};

beforeEach(() => {
  memoria.clear();
  memoria.set(CHAVE_TOKEN, 'jwt-token');
  memoria.set(CHAVE_USUARIO, JSON.stringify({ id: 1, nome: 'Gabriel' }));
});

describe('Alterar senha - sucesso', () => {
  it('deve encerrar a sessao local e levar ao login com o aviso de senha alterada', async () => {
    jest.mocked(alterarSenha).mockResolvedValue(undefined);
    await renderizar();

    await preencherESalvar();

    await waitFor(() =>
      expect(router.push).toHaveBeenCalledWith('/login?motivo=senha-alterada'),
    );
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(alterarSenha).toHaveBeenCalledWith('senhaAntiga', 'senhaNova123');
    expect(memoria.has(CHAVE_TOKEN)).toBe(false);
    expect(memoria.has(CHAVE_USUARIO)).toBe(false);
    expect(queryClientCompartilhado.clear).toHaveBeenCalledTimes(1);
    expect(router.back).not.toHaveBeenCalled();
  });

  it('nao deve chamar o logout no servidor, porque o token ja foi invalidado', async () => {
    jest.mocked(alterarSenha).mockResolvedValue(undefined);
    await renderizar();

    await preencherESalvar();

    await waitFor(() => expect(router.push).toHaveBeenCalled());
    expect(signOut).not.toHaveBeenCalled();
  });
});

describe('Alterar senha - erro', () => {
  it('deve manter na tela, com a sessao intacta, quando a senha atual esta incorreta', async () => {
    jest.mocked(alterarSenha).mockRejectedValue(
      Object.assign(new Error('Request failed with status code 400'), { response: { status: 400 } }),
    );
    await renderizar();

    await preencherESalvar();

    await waitFor(() =>
      expect(mockMostrarToast).toHaveBeenCalledWith(
        'Não foi possível alterar a senha. Verifique sua senha atual e tente novamente.',
        expect.objectContaining({ type: 'error' }),
      ),
    );
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(router.back).not.toHaveBeenCalled();
    expect(memoria.get(CHAVE_TOKEN)).toBe('jwt-token');
    expect(queryClientCompartilhado.clear).not.toHaveBeenCalled();
    expect(screen.getByText('SALVAR NOVA SENHA')).toBeTruthy();
  });
});
