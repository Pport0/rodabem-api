import { signIn, signOut } from '@/services/authService';
import { encerrarSessaoLocal, voltarAoInicio } from '@/services/sessao';
import { createUser, getMeuPerfil } from '@/services/userService';
import { guardarAceiteLocal } from '@/services/termosService';
import { useToast } from '@/shared/ui/molecules/Toast';
import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { createContext, ReactNode, useContext, useRef } from 'react';


interface AuthContextType {
  login: (credentials: { cpfOrPhone: string; password: string }) => void;
  loginIsPending: boolean;
  logout: () => void;
  signUp: (userData: {
    nome: string;
    termoVersao: string;
    cpf?: string;
    telefone?: string;
    senha: string;
    email?: string;
  }) => void;
  signUpIsPending: boolean;
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
  const loginInProgress = useRef(false);
  const signUpInProgress = useRef(false);
  const { mutate: loginMutation, isPending: loginIsPending } = useMutation({
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
        try {
          const perfil = await getMeuPerfil();
          router.replace(perfil?.termoPendente ? '/termo-pendente' : '/(drawer)/home');
        } catch {
          show('Não foi possível verificar o aceite do termo. Tente novamente.', {
            type: 'error',
            backgroundColor: '#bf0a30',
          });
          router.replace('/login');
        }
      } else {
        show('Não foi possível concluir o login. Tente novamente.', { type: 'error', backgroundColor: '#bf0a30' });
      }
    },
    onError: (error) => {
      show(getLoginErrorMessage(error), { type: 'error',backgroundColor: '#bf0a30' });
    },
    onSettled: () => {
      loginInProgress.current = false;
    },
  });

  const { mutate: signUpMutation, isPending: signUpIsPending } = useMutation({
    mutationFn: async (userData: { nome: string, cpf?: string; telefone?: string, senha: string, email?: string; termoVersao: string }) => {
      return createUser({
        cpf: userData.cpf,
        telefone: userData.telefone,
        senha: userData.senha,
        email: userData.email,
        nome: userData.nome,
        termoVersao: userData.termoVersao,
      });
    },
    onSuccess: async (data, userData) => {
      try {
        await guardarAceiteLocal(userData.termoVersao, data.id);
      } catch {
        // O aceite ja foi registrado pelo servidor; a copia local serve apenas para consulta.
      }
      show('Usuário criado com sucesso', { type: 'success', backgroundColor: '#10B981' });
      router.push('/login');
    },
    onError: (error) => {
      show('Falha ao criar usuário', { type: 'error',backgroundColor: '#bf0a30' });
    },
    onSettled: () => {
      signUpInProgress.current = false;
    },
  });

  const login = (credentials: { cpfOrPhone: string; password: string }) => {
    if (loginInProgress.current) return;
    loginInProgress.current = true;
    loginMutation(credentials);
  };

  const signUp = (userData: { nome: string; cpf?: string; telefone?: string; senha: string; email?: string; termoVersao: string }) => {
    if (signUpInProgress.current) return;
    signUpInProgress.current = true;
    signUpMutation(userData);
  };

  const logout = async () => {
    // Invalida o token no servidor enquanto ele ainda esta gravado; se falhar (sem rede, token ja expirado), encerra a sessao local mesmo assim.
    try {
      await signOut();
    } catch {}
    await encerrarSessaoLocal();
    voltarAoInicio();
  };

  return (
    <AuthContext.Provider value={{ login, loginIsPending, logout, signUp, signUpIsPending }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
