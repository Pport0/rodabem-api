import { IsOptional, IsString, IsEmail } from 'class-validator';

export class UpdateUserDto {

  @IsOptional()
  @IsString()
  nome?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  telefone?: string;

  @IsOptional()
  @IsString()
  avatarUrl?: string;
}