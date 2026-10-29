jest.unmock('expo-router');

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Slot } from 'expo-router';
import { renderRouter, screen, fireEvent, waitFor } from 'expo-router/testing-library';
import * as SecureStore from 'expo-secure-store';
import React from 'react';
import { Text } from 'react-native';

import { AuthProvider } from '@/contexts/authContext';
import { api } from '@/services/api';
import Login from '../login';
import Register from '../register';
import Index from '../index';

jest.mock('@/services/api', () => ({
  api: { post: jest.fn(), get: jest.fn() },
}));

const mockMostrarToast = jest.fn();
jest.mock('@/shared/ui/molecules/Toast', () => ({
  useToast: () => ({ show: mockMostrarToast }),
}));

const CHAVE_TOKEN = process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token';
const CHAVE_USUARIO = process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user';

const PLACEHOLDER_IDENTIFICADOR = 'Insira o seu cpf ou telefone';
const PLACEHOLDER_SENHA = 'Insira a sua senha';

const usuarioAutenticado = {
  access_token: 'jwt-token',
  user: { id: 1, nome: 'Gabriel', email: 'gabriel@example.com' },
};

const montarApp = async (initialUrl: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: 0 }, queries: { retry: false, gcTime: 0 } },
  });

  return renderRouter(
    {
      _layout: () => (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <Slot />
          </AuthProvider>
        </QueryClientProvider>
      ),
      index: Index,
      login: Login,
      register: Register,
      '(drawer)/home': () => <Text>TELA HOME</Text>,
      forgotPassword: () => <Text>TELA RECUPERAR SENHA</Text>,
    },
    { initialUrl },
  );
};

const preencherLogin = async (identificador: string, senha: string) => {
  await fireEvent.changeText(
    screen.getByPlaceholderText(PLACEHOLDER_IDENTIFICADOR),
    identificador,
  );
  await fireEvent.changeText(screen.getByPlaceholderText(PLACEHOLDER_SENHA), senha);
  await fireEvent.press(screen.getByRole('button'));
};

describe('Fluxo de login', () => {

  it('deve persistir token e usuario ao autenticar', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: usuarioAutenticado } as any);
    await montarApp('/login');

    await preencherLogin('62999999999', '123456');

    await waitFor(() =>
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(CHAVE_TOKEN, 'jwt-token'),
    );
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      CHAVE_USUARIO,
      JSON.stringify(usuarioAutenticado.user),
    );
  });

  it('nao deve gravar nada no armazenamento quando o login falha', async () => {
    jest.mocked(api.post).mockRejectedValue(new Error('Credenciais inválidas'));
    await montarApp('/login');

    await preencherLogin('62999999999', 'senha-errada');

    await waitFor(() => expect(mockMostrarToast).toHaveBeenCalled());
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

});
