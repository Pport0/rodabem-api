import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, renderHook, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import React, { ReactNode } from 'react';

import { AuthProvider, useAuth } from '../authContext';
import { signIn } from '@/services/authService';
import { createUser, getMeuPerfil } from '@/services/userService';

jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: () => ({
      interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
    }),
    isAxiosError: (e: unknown) => Boolean(e && typeof e === 'object' && 'isAxiosError' in e),
  },
}));

jest.mock('@/services/authService', () => ({ signIn: jest.fn(), signOut: jest.fn().mockResolvedValue(undefined) }));
jest.mock('@/services/userService', () => ({ createUser: jest.fn(), getMeuPerfil: jest.fn() }));

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

function AuthConsumerWithoutProvider() {
  useAuth();
  return null;
}

class AuthErrorBoundary extends React.Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    return this.state.error ? <Text>{this.state.error.message}</Text> : this.props.children;
  }
}

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
    jest.mocked(getMeuPerfil).mockResolvedValue({ termoPendente: false } as any);
    const { result } = await montarAuth();

    result.current.login({ cpfOrPhone: '62999999999', password: '123456' });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(drawer)/home'));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('deve levar ao aceite do termo quando o usuario ainda nao aceitou', async () => {
    jest.mocked(signIn).mockResolvedValue(usuarioAutenticado as any);
    jest.mocked(getMeuPerfil).mockResolvedValue({ termoPendente: true } as any);
    const { result } = await montarAuth();

    result.current.login({ cpfOrPhone: '62999999999', password: '123456' });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/termo-pendente'));
  });

  it('nao deve deixar o usuario na area autenticada quando nao consegue verificar o termo', async () => {
    jest.mocked(signIn).mockResolvedValue(usuarioAutenticado as any);
    jest.mocked(getMeuPerfil).mockRejectedValue(new Error('Network Error'));
    const { result } = await montarAuth();

    result.current.login({ cpfOrPhone: '62999999999', password: '123456' });

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/login'));
    expect(router.replace).not.toHaveBeenCalledWith('/(drawer)/home');
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

  it('deve ignorar um segundo login enquanto a primeira requisicao esta pendente', async () => {
    let concluir!: (valor: any) => void;
    jest.mocked(signIn).mockReturnValue(new Promise((resolve) => { concluir = resolve; }) as any);
    const { result } = await montarAuth();

    result.current.login({ cpfOrPhone: '62999999999', password: '123456' });
    result.current.login({ cpfOrPhone: '62999999999', password: '123456' });

    await waitFor(() => expect(signIn).toHaveBeenCalledTimes(1));
    expect(signIn).toHaveBeenCalledTimes(1);
    expect(result.current.loginIsPending).toBe(true);
    concluir(usuarioAutenticado);
    await waitFor(() => expect(result.current.loginIsPending).toBe(false));
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
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(CHAVE_TOKEN, expect.anything());
    expect(SecureStore.setItemAsync).not.toHaveBeenCalledWith(CHAVE_USUARIO, expect.anything());
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

  it('deve ignorar um segundo cadastro enquanto a primeira requisicao esta pendente', async () => {
    let concluir!: (valor: any) => void;
    jest.mocked(createUser).mockReturnValue(new Promise((resolve) => { concluir = resolve; }) as any);
    const { result } = await montarAuth();

    result.current.signUp(novoUsuario);
    result.current.signUp(novoUsuario);

    await waitFor(() => expect(createUser).toHaveBeenCalledTimes(1));
    expect(createUser).toHaveBeenCalledTimes(1);
    expect(result.current.signUpIsPending).toBe(true);
    concluir({ id: 1 });
    await waitFor(() => expect(result.current.signUpIsPending).toBe(false));
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

    await waitFor(() => expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(CHAVE_TOKEN));
  });

  it('deve redirecionar para a tela inicial sem deixar volta para a area autenticada', async () => {
    const { result } = await montarAuth();

    await result.current.logout();

    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/'));
    expect(router.push).not.toHaveBeenCalled();
  });

  it('o logout deve apagar tambem os dados do usuario', async () => {
    const { result } = await montarAuth();

    result.current.logout();

    await waitFor(() => expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(CHAVE_USUARIO));
  });
});

describe('authContext - uso fora do provider', () => {
  it('deve lancar erro ao usar useAuth sem AuthProvider', async () => {
    const silenciar = jest.spyOn(console, 'error').mockImplementation(() => {});

    await render(
      <AuthErrorBoundary>
        <AuthConsumerWithoutProvider />
      </AuthErrorBoundary>,
    );
    expect(screen.getByText('useAuth must be used within AuthProvider')).toBeTruthy();
    expect(silenciar).toHaveBeenCalled();

    silenciar.mockRestore();
  });
});
