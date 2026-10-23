import { User } from "@/@types/user";
import { api } from "./api";

export async function signIn(userData: { cpf?: string; telefone?: string, senha: string }): Promise<User> {
    const response = await api.post<User>('/auth/login', userData);
    return response.data;
}

// O token vai no header pelo interceptor do api.ts; o back o coloca na blacklist.
export async function signOut(): Promise<void> {
    await api.post('/auth/logout');
}

// O back responde a mesma mensagem exista ou nao o e-mail (#28).
export async function forgotPassword(email: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/forgot-password', { email });
    return response.data;
}

export async function resetPassword(token: string, novaSenha: string): Promise<{ message: string }> {
    const response = await api.post<{ message: string }>('/auth/reset-password', { token, novaSenha });
    return response.data;
}   