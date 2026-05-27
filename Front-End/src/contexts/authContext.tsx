import { User } from '@/@types/user';
import { signIn } from '@/services/authService';
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

export function AuthProvider({ children }: { children: ReactNode }) { 
  const { show } = useToast();
  const { mutate: loginMutation } = useMutation({
    mutationFn: async ({ cpfOrPhone, password }: { cpfOrPhone: string, password: string }) => {
      let userData: { cpf?: string; telefone?: string, senha: string } = { senha: password };
      return signIn({ cpf: cpfOrPhone, telefone: cpfOrPhone, senha: password });
    },
    onSuccess: (data: any) => {
      show('Login realizado com sucesso', { type: 'success', backgroundColor: '#10B981' }); 
      const token = data.access_token;
      if(token) {
        SecureStore.setItem(process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token', token);
        SecureStore.setItem(process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user', JSON.stringify(data.user));
        router.push('/(drawer)/home');
      }
    },
    onError: (error) => {
      show('Falha ao fazer login' + error.message, { type: 'error',backgroundColor: '#bf0a30' });
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

  const logout = () => {
    SecureStore.deleteItemAsync(process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token');
    router.push('/');
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