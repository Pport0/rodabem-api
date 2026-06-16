import { User } from "@/@types/user";
import { api } from "./api";

export async function createUser(userData: {
  nome: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  senha: string;
}): Promise<User> {
  const response = await api.post<User>("/users", userData);
  return response.data;
}

export async function getMeuPerfil(): Promise<User | null> {
  const response = await api.get<User>("/users/me");
  return response.data;
}
