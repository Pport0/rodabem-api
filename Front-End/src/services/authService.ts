import { User } from "@/@types/user";
import { api } from "./api";

export async function signIn(userData: { cpf?: string; telefone?: string, senha: string }): Promise<User> {
    const response = await api.post<User>('/auth/login', userData);
    return response.data;
}   