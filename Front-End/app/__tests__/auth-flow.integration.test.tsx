/**
 * Testes de integracao do fluxo de autenticacao.
 */
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
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
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
  it('deve autenticar e chegar na home', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: usuarioAutenticado } as any);
    await montarApp('/login');

    await preencherLogin('62999999999', '123456');

    await waitFor(() => expect(screen.getByText('TELA HOME')).toBeTruthy());
  });

  it('deve enviar as credenciais ao endpoint de login', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: usuarioAutenticado } as any);
    await montarApp('/login');

    await preencherLogin('62999999999', '123456');

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith('/auth/login', {
        cpf: '62999999999',
        telefone: '62999999999',
        senha: '123456',
      }),
    );
  });

  it('deve persistir token e usuario ao autenticar', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: usuarioAutenticado } as any);
    await montarApp('/login');

    await preencherLogin('62999999999', '123456');

    await waitFor(() =>
      expect(SecureStore.setItem).toHaveBeenCalledWith(CHAVE_TOKEN, 'jwt-token'),
    );
    expect(SecureStore.setItem).toHaveBeenCalledWith(
      CHAVE_USUARIO,
      JSON.stringify(usuarioAutenticado.user),
    );
  });

  it('deve permanecer na tela de login quando as credenciais sao invalidas', async () => {
    jest.mocked(api.post).mockRejectedValue(new Error('Credenciais inválidas'));
    await montarApp('/login');

    await preencherLogin('62999999999', 'senha-errada');

    await waitFor(() => expect(mockMostrarToast).toHaveBeenCalled());
    expect(screen.queryByText('TELA HOME')).toBeNull();
    expect(screen.getByText('Entrar')).toBeTruthy();
  });

  it('nao deve gravar nada no armazenamento quando o login falha', async () => {
    jest.mocked(api.post).mockRejectedValue(new Error('Credenciais inválidas'));
    await montarApp('/login');

    await preencherLogin('62999999999', 'senha-errada');

    await waitFor(() => expect(mockMostrarToast).toHaveBeenCalled());
    expect(SecureStore.setItem).not.toHaveBeenCalled();
  });

  it('deve navegar da tela de login para a recuperacao de senha', async () => {
    await montarApp('/login');

    await fireEvent.press(screen.getByText('Esqueci minha senha'));

    await waitFor(() =>
      expect(screen.getByText('TELA RECUPERAR SENHA')).toBeTruthy(),
    );
  });
});

describe('Fluxo de cadastro', () => {
  const preencherCadastro = async () => {
    const campos: [string, string][] = [
      ['Digite aqui o seu nome completo', 'Gabriel Silva'],
      ['000.000.000-00', '52998224725'],
      ['(00) 00000-0000', '62999999999'],
      ['Digite aqui o seu email', 'gabriel@example.com'],
      ['Digite uma senha', '123456'],
      ['Confirme a sua senha', '123456'],
    ];
    for (const [placeholder, valor] of campos) {
      await fireEvent.changeText(screen.getByPlaceholderText(placeholder), valor);
    }
    await fireEvent.press(screen.getByRole('button'));
  };

  it('deve criar a conta e levar o usuario para o login', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: { id: 1 } } as any);
    await montarApp('/register');

    await preencherCadastro();

    await waitFor(() => expect(screen.getByText('Entrar')).toBeTruthy());
  });

  it('deve enviar o cadastro ao endpoint de usuarios', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: { id: 1 } } as any);
    await montarApp('/register');

    await preencherCadastro();

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/users',
        expect.objectContaining({
          nome: 'Gabriel Silva',
          cpf: '52998224725',
          telefone: '62999999999',
        }),
      ),
    );
  });

  it('nao deve autenticar o usuario apos o cadastro', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: { id: 1 } } as any);
    await montarApp('/register');

    await preencherCadastro();

    await waitFor(() => expect(screen.getByText('Entrar')).toBeTruthy());
    expect(SecureStore.setItem).not.toHaveBeenCalled();
  });

  it('deve permanecer no cadastro quando a validacao falha', async () => {
    await montarApp('/register');

    await fireEvent.press(screen.getByRole('button'));

    await waitFor(() =>
      expect(screen.getByText('Nome completo é obrigatório')).toBeTruthy(),
    );
    expect(api.post).not.toHaveBeenCalled();
    expect(screen.queryByText('Entrar')).toBeNull();
  });
});

describe('Navegacao a partir da tela inicial', () => {
  it('deve levar para o login', async () => {
    await montarApp('/');

    await fireEvent.press(screen.getByText('ENTRAR'));

    await waitFor(() => expect(screen.getByText('Entrar')).toBeTruthy());
  });

  it('deve levar para o cadastro', async () => {
    await montarApp('/');

    await fireEvent.press(screen.getByText('CRIAR CONTA'));

    await waitFor(() => expect(screen.getByText('Informe os seus dados pessoais')).toBeTruthy());
  });
});

describe('Percurso completo', () => {
  it('deve ir da tela inicial ao login e concluir a autenticacao', async () => {
    jest.mocked(api.post).mockResolvedValue({ data: usuarioAutenticado } as any);
    await montarApp('/');

    await fireEvent.press(screen.getByText('ENTRAR'));
    await waitFor(() => expect(screen.getByText('Entrar')).toBeTruthy());

    await preencherLogin('62999999999', '123456');

    await waitFor(() => expect(screen.getByText('TELA HOME')).toBeTruthy());
    expect(SecureStore.setItem).toHaveBeenCalledWith(CHAVE_TOKEN, 'jwt-token');
  });
});
