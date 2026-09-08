import { IsEmail, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório.' })
  nome: string;

  @IsEmail({}, { message: 'E-mail inválido.' })
  @IsNotEmpty({ message: 'E-mail é obrigatório.' })
  email: string;

  @IsString()
  @Length(6, 100, { message: 'Senha deve ter entre 6 e 100 caracteres.' })
  @IsNotEmpty({ message: 'Senha é obrigatória.' })
  senha: string;

  @IsString()
  @Length(11, 14, { message: 'CPF deve ter entre 11 e 14 caracteres.' })
  @IsNotEmpty({ message: 'CPF é obrigatório.' })
  cpf: string;

  @IsOptional()
  @IsString()
  telefone?: string;
}