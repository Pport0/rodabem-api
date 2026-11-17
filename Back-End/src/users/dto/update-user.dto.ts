import { IsEmail, IsOptional, IsString, IsIn, IsInt } from 'class-validator';

const DIAS_PERMITIDOS = [7, 15, 30, 60] as const;

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

  @IsOptional()
  @IsInt()
  @IsIn(DIAS_PERMITIDOS, {
    message: `diasAlertaVencimento deve ser um dos valores: ${DIAS_PERMITIDOS.join(', ')}.`,
  })
  diasAlertaVencimento?: number;
}