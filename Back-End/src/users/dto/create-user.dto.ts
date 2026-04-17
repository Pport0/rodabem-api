import { IsEmail, IsNotEmpty, IsString, Length } from 'class-validator';

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  nome: string;

  @IsEmail()
  email: string;

  @IsString()
  @Length(6, 100)
  senha: string;

  @IsString()
  @Length(11, 14)
  cpf: string;

  @IsString()
  telefone: string;
}