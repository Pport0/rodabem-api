export interface User {
  id?: number;
  nome: string;
  email: string;
  password?: string;
  token?: string;
  cpf?: string;
  telefone?: string;
  termoPendente?: boolean;
  diasAlertaVencimento?: 7 | 15 | 30 | 60;
}

export interface createUserDto {
  nome: string;
  email?: string;
  cpf?: string;
  telefone?: string;
  senha: string;
  termoVersao: string;
} 
