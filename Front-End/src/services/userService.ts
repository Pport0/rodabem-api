import { User } from "@/@types/user";
import { api } from "./api";

export async function createUser(userData: {
  nome: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  senha: string;
  termoVersao: string;
}): Promise<User> {
  const response = await api.post<User>("/users", userData);
  return response.data;
}

export async function getMeuPerfil(): Promise<User | null> {
  const response = await api.get<User>("/users/me");
  return response.data;
}

export async function updateUser(
  id: number,
  userData: { nome: string; email: string; telefone: string | null },
): Promise<User> {
  const response = await api.put<User>(`/users/${id}`, userData);
  return response.data;
}

export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<void> {
  await api.patch("/users/me/senha", { senhaAtual, novaSenha });
}

export async function deleteUser(id: number): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>(`/users/${id}`);
  return response.data;
}
