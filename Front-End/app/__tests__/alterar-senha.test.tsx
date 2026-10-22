import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import React, { ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';

import AlterarSenha from '../alterarSenha';
import { alterarSenha } from '@/services/userService';

jest.mock('@/services/userService', () => ({ alterarSenha: jest.fn() }));

const mockMostrarToast = jest.fn();
jest.mock('@/shared/ui/molecules/Toast', () => ({
  useToast: () => ({ show: mockMostrarToast }),
}));

const CHAVE_TOKEN = process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token';
const CHAVE_USUARIO = process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user';

const montarTela = async () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { gcTime: 0 } },
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  await render(<AlterarSenha />, { wrapper });
  await waitFor(() => expect(screen.getByText('ALTERAR SENHA')).toBeTruthy());
};

const trocarSenhaCom = async (novaSenha = 'novaSenha456') => {
  await montarTela();

  await fireEvent.changeText(screen.getByPlaceholderText('Digite sua senha atual'), 'senhaAtual123');
  await fireEvent.changeText(screen.getByPlaceholderText('Digite a nova senha'), novaSenha);
  await fireEvent.changeText(screen.getByPlaceholderText('Confirme a nova senha'), novaSenha);
  await fireEvent.press(screen.getByRole('button'));
};

describe('Alterar senha - sessao encerrada pelo servidor', () => {
  beforeEach(() => {
    jest.mocked(alterarSenha).mockResolvedValue({ message: 'Senha alterada com sucesso.' } as never);
  });

  it('deve levar o usuario para autenticar de novo depois de trocar a senha', async () => {
    await trocarSenhaCom();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
  });

  it('nao deve devolver o usuario para a area autenticada com a sessao encerrada', async () => {
    await trocarSenhaCom();

    await waitFor(() => expect(alterarSenha).toHaveBeenCalled());

    expect(router.back).not.toHaveBeenCalled();
  });

  it('deve apagar a credencial guardada no aparelho', async () => {
    await trocarSenhaCom();

    await waitFor(() =>
      expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(CHAVE_TOKEN),
    );
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(CHAVE_USUARIO);
  });

  it('deve abrir o login informando por que a sessao terminou', async () => {
    await trocarSenhaCom();

    await waitFor(() => expect(router.push).toHaveBeenCalled());

    const destino = String(jest.mocked(router.push).mock.calls[0][0]);

    expect(destino).toContain('/login');
    expect(destino).toContain('motivo=senha-alterada');
  });

  it('nao deve encerrar a sessao quando a troca de senha falha', async () => {
    jest.mocked(alterarSenha).mockRejectedValue(new Error('senha atual incorreta'));

    await trocarSenhaCom();

    await waitFor(() => expect(alterarSenha).toHaveBeenCalled());

    expect(router.replace).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('deve explicar a falha sem tirar o usuario da tela', async () => {
    jest.mocked(alterarSenha).mockRejectedValue(new Error('senha atual incorreta'));

    await trocarSenhaCom();

    await waitFor(() => expect(mockMostrarToast).toHaveBeenCalled());

    const mensagens = mockMostrarToast.mock.calls.map(([texto]) => String(texto)).join(' ');

    expect(mensagens).toMatch(/senha atual/i);
  });
});
