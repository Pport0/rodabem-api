import { User } from '@/@types/user';
import { signIn, signOut } from '@/services/authService';
import { encerrarSessaoLocal, voltarAoInicio } from '@/services/sessao';
import { createUser } from '@/services/userService';
import { useToast } from '@/shared/ui/molecules/Toast';
import { UseMutateFunction, useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext } from 'react';


interface AuthContextType {
  login: UseMutateFunction<User, Error, {
    cpfOrPhone: string;
    password: string;
  }, unknown>;
  logout: () => void;
  signUp: UseMutateFunction<User, Error, {
    nome: string;
    cpf?: string;
    telefone?: string;
    senha: string;
    email?: string;
  }, unknown>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Usa a mensagem da API (ja em portugues); a do axios ("Request failed with status code 401") nao serve ao usuario.
function getLoginErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as {
      response?: { data?: { message?: string | string[] } };
    };
    const message = axiosError.response?.data?.message;
    if (Array.isArray(message) && message.length > 0) return `Falha ao fazer login: ${message[0]}`;
    if (typeof message === 'string' && message) return `Falha ao fazer login: ${message}`;
  }
  return 'Falha ao fazer login. Verifique sua conexão e tente novamente.';
}

export function AuthProvider({ children }: { children: ReactNode }) { 
  const { show } = useToast();
  const { mutate: loginMutation } = useMutation({
    mutationFn: async ({ cpfOrPhone, password }: { cpfOrPhone: string, password: string }) => {
      let userData: { cpf?: string; telefone?: string, senha: string } = { senha: password };
      return signIn({ cpf: cpfOrPhone, telefone: cpfOrPhone, senha: password });
    },
    onSuccess: async (data: any) => {
      const token = data.access_token;
      if (token) {
        await SecureStore.setItemAsync(process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token', token);
        await SecureStore.setItemAsync(process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user', JSON.stringify(data.user));
        show('Login realizado com sucesso', { type: 'success', backgroundColor: '#10B981' });
        router.push('/(drawer)/home');
      } else {
        show('Não foi possível concluir o login. Tente novamente.', { type: 'error', backgroundColor: '#bf0a30' });
      }
    },
    onError: (error) => {
      show(getLoginErrorMessage(error), { type: 'error',backgroundColor: '#bf0a30' });
    },
  });

  const { mutate: signUpMutation } = useMutation({
    mutationFn: async (userData: { nome: string, cpf?: string; telefone?: string, senha: string, email?: string }) => {
      return createUser({
        cpf: userData.cpf,
        telefone: userData.telefone,
        senha: userData.senha,
        email: userData.email,
        nome: userData.nome,
      });
    },
    onSuccess: (data) => {
      show('Usuário criado com sucesso', { type: 'success', backgroundColor: '#10B981' });
      router.push('/login');
    },
    onError: (error) => {
      show('Falha ao criar usuário', { type: 'error',backgroundColor: '#bf0a30' });
    },
  });

  const logout = async () => {
    // Invalida o token no servidor enquanto ele ainda esta gravado; se falhar (sem rede, token ja expirado), encerra a sessao local mesmo assim.
    try {
      await signOut();
    } catch {}
    await encerrarSessaoLocal();
    voltarAoInicio();
  };

  return (
    <AuthContext.Provider value={{ login: loginMutation, logout, signUp: signUpMutation }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
