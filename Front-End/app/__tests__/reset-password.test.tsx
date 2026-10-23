import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import React, { ReactNode } from 'react';

import ResetPassword from '../reset-password';
import { resetPassword } from '@/services/authService';

jest.mock('@/services/authService', () => ({ resetPassword: jest.fn() }));

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), navigate: jest.fn(), replace: jest.fn(), back: jest.fn() },
  useLocalSearchParams: jest.fn(),
}));

const mockMostrarToast = jest.fn();
jest.mock('@/shared/ui/molecules/Toast', () => ({
  useToast: () => ({ show: mockMostrarToast }),
}));

const PLACEHOLDER = {
  codigo: 'Cole aqui o código do e-mail',
  senha: 'Digite a nova senha',
  confirmar: 'Confirme a nova senha',
};
const TOKEN = '3f1c2b9e-8a7d-4c6b-9e5f-1a2b3c4d5e6f';
const SUCESSO = 'Senha redefinida com sucesso. Faça login novamente.';

const erroDaApi = (message: string) =>
  Object.assign(new Error('Request failed with status code 400'), {
    response: { status: 400, data: { message } },
  });

const montarTela = async (params: { token?: string } = {}) => {
  jest.mocked(useLocalSearchParams).mockReturnValue(params as never);
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  await render(<ResetPassword />, { wrapper });
};

const preencher = async ({ codigo, senha = '123456', confirmar = senha }: { codigo?: string; senha?: string; confirmar?: string }) => {
  if (codigo !== undefined) await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER.codigo), codigo);
  await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER.senha), senha);
  await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER.confirmar), confirmar);
};

const redefinir = async () => {
  const botoes = screen.getAllByText('REDEFINIR SENHA');
  await fireEvent.press(botoes[botoes.length - 1]);
};

describe('Redefinir senha - codigo', () => {
  it('deve preencher o codigo vindo do link do e-mail', async () => {
    await montarTela({ token: TOKEN });

    expect(screen.getByPlaceholderText(PLACEHOLDER.codigo).props.value).toBe(TOKEN);
  });

  it('deve aceitar o codigo colado quando o app nao foi aberto pelo link', async () => {
    jest.mocked(resetPassword).mockResolvedValue({ message: SUCESSO });
    await montarTela();

    await preencher({ codigo: `  ${TOKEN}  ` });
    await redefinir();

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith(TOKEN, '123456'));
  });

  it('deve aceitar o link inteiro colado no lugar do codigo', async () => {
    jest.mocked(resetPassword).mockResolvedValue({ message: SUCESSO });
    await montarTela();

    await preencher({ codigo: `rodabem://reset-password?token=${TOKEN}` });
    await redefinir();

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith(TOKEN, '123456'));
  });

  it('deve exigir o codigo', async () => {
    await montarTela();

    await preencher({ codigo: '' });
    await redefinir();

    expect(screen.getByText('Informe o código recebido por e-mail.')).toBeTruthy();
    expect(resetPassword).not.toHaveBeenCalled();
  });
});

describe('Redefinir senha - nova senha', () => {
  // it.todo da tester em abertura.test.tsx: "deve permitir definir nova senha sem exigir a anterior"
  it('deve permitir definir nova senha sem pedir a senha anterior', async () => {
    jest.mocked(resetPassword).mockResolvedValue({ message: SUCESSO });
    await montarTela({ token: TOKEN });

    expect(screen.queryByPlaceholderText(/senha atual/i)).toBeNull();
    await preencher({ senha: 'nova123' });
    await redefinir();

    await waitFor(() => expect(resetPassword).toHaveBeenCalledWith(TOKEN, 'nova123'));
  });

  it('deve recusar senha com menos de 6 caracteres', async () => {
    await montarTela({ token: TOKEN });

    await preencher({ senha: '12345' });
    await redefinir();

    expect(screen.getByText('A nova senha deve ter no mínimo 6 caracteres.')).toBeTruthy();
    expect(resetPassword).not.toHaveBeenCalled();
  });

  it('deve recusar confirmacao diferente', async () => {
    await montarTela({ token: TOKEN });

    await preencher({ senha: '123456', confirmar: '654321' });
    await redefinir();

    expect(screen.getByText('As senhas não coincidem.')).toBeTruthy();
    expect(resetPassword).not.toHaveBeenCalled();
  });
});

describe('Redefinir senha - resultado', () => {
  it('deve mostrar a mensagem do back e ir ao login no sucesso', async () => {
    jest.mocked(resetPassword).mockResolvedValue({ message: SUCESSO });
    await montarTela({ token: TOKEN });

    await preencher({});
    await redefinir();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(mockMostrarToast).toHaveBeenCalledWith(SUCESSO, expect.objectContaining({ type: 'success' }));
  });

  it('deve explicar o codigo invalido e oferecer pedir novo e-mail', async () => {
    jest.mocked(resetPassword).mockRejectedValue(erroDaApi('Token inválido ou expirado.'));
    await montarTela({ token: TOKEN });

    await preencher({});
    await redefinir();

    expect(await screen.findByText(/inválido ou já expirou/)).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalledWith('/login');
    await fireEvent.press(screen.getByText('PEDIR NOVO E-MAIL'));
    expect(router.replace).toHaveBeenCalledWith('/forgotPassword');
  });

  it('deve exibir as outras mensagens do back como vieram', async () => {
    jest.mocked(resetPassword).mockRejectedValue(erroDaApi('A nova senha deve ter pelo menos 6 caracteres.'));
    await montarTela({ token: TOKEN });

    await preencher({});
    await redefinir();

    expect(await screen.findByText('A nova senha deve ter pelo menos 6 caracteres.')).toBeTruthy();
    expect(screen.queryByText('PEDIR NOVO E-MAIL')).toBeNull();
  });

  it('deve explicar a falha de conexao', async () => {
    jest.mocked(resetPassword).mockRejectedValue(new Error('Network Error'));
    await montarTela({ token: TOKEN });

    await preencher({});
    await redefinir();

    expect(
      await screen.findByText('Não foi possível redefinir a senha. Verifique sua conexão e tente novamente.'),
    ).toBeTruthy();
  });
});
