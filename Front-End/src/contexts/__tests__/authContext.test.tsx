import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { ReactNode } from 'react';

import { AuthProvider, useAuth } from '../authContext';
import { signIn } from '@/services/authService';
import { createUser } from '@/services/userService';

jest.mock('@/services/authService', () => ({ signIn: jest.fn() }));
jest.mock('@/services/userService', () => ({ createUser: jest.fn() }));

const mockMostrarToast = jest.fn();
jest.mock('@/shared/ui/molecules/Toast', () => ({
  useToast: () => ({ show: mockMostrarToast }),
}));

const CHAVE_TOKEN = process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token';
const CHAVE_USUARIO = process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user';

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

const usuarioAutenticado = {
  access_token: 'jwt-token',
  user: { id: 1, nome: 'Gabriel', email: 'gabriel@example.com' },
};

describe('authContext - login', () => {
  it('deve gravar o token no armazenamento seguro apos login bem-sucedido', async () => {
    jest.mocked(signIn).mockResolvedValue(usuarioAutenticado as any);
    const { result } = await montarAuth();

    result.current.login({ cpfOrPhone: '62999999999', password: '123456' });

    await waitFor(() =>
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(CHAVE_TOKEN, 'jwt-token'),
    );
  });

  it('deve gravar os dados do usuario serializados em JSON', async () => {
    jest.mocked(signIn).mockResolvedValue(usuarioAutenticado as any);
    const { result } = await montarAuth();

    result.current.login({ cpfOrPhone: '62999999999', password: '123456' });

    await waitFor(() =>
      expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
        CHAVE_USUARIO,
        JSON.stringify(usuarioAutenticado.user),
      ),
    );
  });

  it('deve navegar para a home apos login bem-sucedido', async () => {
    jest.mocked(signIn).mockResolvedValue(usuarioAutenticado as any);
    const { result } = await montarAuth();

    result.current.login({ cpfOrPhone: '62999999999', password: '123456' });

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/(drawer)/home'));
  });

  it('deve exibir mensagem de sucesso ao entrar', async () => {
    jest.mocked(signIn).mockResolvedValue(usuarioAutenticado as any);
    const { result } = await montarAuth();

    result.current.login({ cpfOrPhone: '62999999999', password: '123456' });

    await waitFor(() =>
      expect(mockMostrarToast).toHaveBeenCalledWith(
        'Login realizado com sucesso',
        expect.objectContaining({ type: 'success' }),
      ),
    );
  });

  describe('resposta sem token', () => {
    const semToken = { user: { id: 1, nome: 'Gabriel' } };

    it('nao deve gravar nada quando a resposta nao traz access_token', async () => {
      jest.mocked(signIn).mockResolvedValue(semToken as any);
      const { result } = await montarAuth();

      result.current.login({ cpfOrPhone: '62999999999', password: '123456' });

      await waitFor(() => expect(mockMostrarToast).toHaveBeenCalled());
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
    });

    it('nao deve navegar quando a resposta nao traz access_token', async () => {
      jest.mocked(signIn).mockResolvedValue(semToken as any);
      const { result } = await montarAuth();

      result.current.login({ cpfOrPhone: '62999999999', password: '123456' });

      await waitFor(() => expect(mockMostrarToast).toHaveBeenCalled());
      expect(router.push).not.toHaveBeenCalled();
    });

    it('nao deve anunciar sucesso quando a resposta nao traz token', async () => {
      jest.mocked(signIn).mockResolvedValue(semToken as any);
      const { result } = await montarAuth();

      result.current.login({ cpfOrPhone: '62999999999', password: '123456' });

      await waitFor(() => expect(mockMostrarToast).toHaveBeenCalled());
      expect(mockMostrarToast).not.toHaveBeenCalledWith(
        'Login realizado com sucesso',
        expect.objectContaining({ type: 'success' }),
      );
    });
  });

  describe('falha no login', () => {
    it('deve exibir mensagem de erro quando o login falha', async () => {
      jest.mocked(signIn).mockRejectedValue(new Error('Credenciais inválidas'));
      const { result } = await montarAuth();

      result.current.login({ cpfOrPhone: '62999999999', password: 'errada' });

      await waitFor(() =>
        expect(mockMostrarToast).toHaveBeenCalledWith(
          expect.stringContaining('Falha ao fazer login'),
          expect.objectContaining({ type: 'error' }),
        ),
      );
    });

    it('nao deve gravar token nem navegar quando o login falha', async () => {
      jest.mocked(signIn).mockRejectedValue(new Error('Credenciais inválidas'));
      const { result } = await montarAuth();

      result.current.login({ cpfOrPhone: '62999999999', password: 'errada' });

      await waitFor(() => expect(mockMostrarToast).toHaveBeenCalled());
      expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
      expect(router.push).not.toHaveBeenCalled();
    });
  });

  describe('mensagem de falha legivel', () => {
    const erroDaApi = (message: unknown) =>
      Object.assign(new Error('Request failed with status code 401'), {
        response: { status: 401, data: { message } },
      });

    it('deve exibir a mensagem da API, separada do texto fixo', async () => {
      jest.mocked(signIn).mockRejectedValue(erroDaApi('Credenciais inválidas'));
      const { result } = await montarAuth();

      result.current.login({ cpfOrPhone: '62999999999', password: 'errada' });

      await waitFor(() =>
        expect(mockMostrarToast).toHaveBeenCalledWith(
          'Falha ao fazer login: Credenciais inválidas',
          expect.objectContaining({ type: 'error' }),
        ),
      );
    });

    it('deve usar a primeira mensagem quando a API devolve uma lista', async () => {
      jest.mocked(signIn).mockRejectedValue(erroDaApi(['senha deve ser texto', 'outro']));
      const { result } = await montarAuth();

      result.current.login({ cpfOrPhone: '62999999999', password: 'errada' });

      await waitFor(() =>
        expect(mockMostrarToast).toHaveBeenCalledWith(
          'Falha ao fazer login: senha deve ser texto',
          expect.objectContaining({ type: 'error' }),
        ),
      );
    });

    it('nao deve exibir o texto em ingles do axios quando a API nao manda mensagem', async () => {
      jest.mocked(signIn).mockRejectedValue(new Error('Network Error'));
      const { result } = await montarAuth();

      result.current.login({ cpfOrPhone: '62999999999', password: '123456' });

      await waitFor(() => expect(mockMostrarToast).toHaveBeenCalled());
      const [mensagem] = mockMostrarToast.mock.calls[0];
      expect(mensagem).toBe('Falha ao fazer login. Verifique sua conexão e tente novamente.');
      expect(mensagem).not.toMatch(/Network Error|Request failed/);
    });
  });
});

describe('authContext - cadastro', () => {
  const novoUsuario = {
    nome: 'Gabriel',
    cpf: '52998224725',
    telefone: '62999999999',
    senha: '123456',
    email: 'gabriel@example.com',
  };

  it('deve repassar os dados do formulario ao servico de criacao', async () => {
    jest.mocked(createUser).mockResolvedValue({ id: 1 } as any);
    const { result } = await montarAuth();

    result.current.signUp(novoUsuario);

    await waitFor(() => expect(createUser).toHaveBeenCalledWith(novoUsuario));
  });

  it('deve redirecionar para o login apos cadastro bem-sucedido', async () => {
    jest.mocked(createUser).mockResolvedValue({ id: 1 } as any);
    const { result } = await montarAuth();

    result.current.signUp(novoUsuario);

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/login'));
  });

  it('deve exibir mensagem de sucesso apos cadastro', async () => {
    jest.mocked(createUser).mockResolvedValue({ id: 1 } as any);
    const { result } = await montarAuth();

    result.current.signUp(novoUsuario);

    await waitFor(() =>
      expect(mockMostrarToast).toHaveBeenCalledWith(
        'Usuário criado com sucesso',
        expect.objectContaining({ type: 'success' }),
      ),
    );
  });

  it('nao deve autenticar o usuario logo apos o cadastro', async () => {
    jest.mocked(createUser).mockResolvedValue({ id: 1 } as any);
    const { result } = await montarAuth();

    result.current.signUp(novoUsuario);

    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/login'));
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('deve exibir mensagem de erro quando o cadastro falha', async () => {
    jest.mocked(createUser).mockRejectedValue(new Error('CPF já cadastrado'));
    const { result } = await montarAuth();

    result.current.signUp(novoUsuario);

    await waitFor(() =>
      expect(mockMostrarToast).toHaveBeenCalledWith(
        'Falha ao criar usuário',
        expect.objectContaining({ type: 'error' }),
      ),
    );
  });

  it('nao deve navegar quando o cadastro falha', async () => {
    jest.mocked(createUser).mockRejectedValue(new Error('CPF já cadastrado'));
    const { result } = await montarAuth();

    result.current.signUp(novoUsuario);

    await waitFor(() => expect(mockMostrarToast).toHaveBeenCalled());
    expect(router.push).not.toHaveBeenCalled();
  });
});

describe('authContext - logout', () => {
  it('deve apagar o token do armazenamento seguro', async () => {
    const { result } = await montarAuth();

    result.current.logout();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(CHAVE_TOKEN);
  });

  it('deve redirecionar para a tela inicial sem deixar volta para a area autenticada', async () => {
    const { result } = await montarAuth();

    await result.current.logout();

    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.push).not.toHaveBeenCalled();
  });

  it('o logout deve apagar tambem os dados do usuario', async () => {
    const { result } = await montarAuth();

    result.current.logout();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(CHAVE_USUARIO);
  });
});

describe('authContext - uso fora do provider', () => {
  it('deve lancar erro ao usar useAuth sem AuthProvider', async () => {
    const silenciar = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(renderHook(() => useAuth())).rejects.toThrow(
      'useAuth must be used within AuthProvider',
    );

    silenciar.mockRestore();
  });
});
