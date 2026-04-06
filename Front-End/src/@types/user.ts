export interface User {
  id?: number;
  nome: string;
  email: string;
  password?: string;
  token?: string;
  cpf?: string;
  telefone?: string;
}

export interface createUserDto {
  nome: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  senha: string;
} 