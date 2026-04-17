import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TipoCombustivel } from '@prisma/client';

export class CreateAbastecimentoDto {
  @IsNumber()
  @Min(0.01, { message: 'Preço por litro deve ser maior que zero.' })
  @IsNotEmpty({ message: 'Preço por litro é obrigatório.' })
  precoPorLitro: number;

  @IsNumber()
  @Min(0.01, { message: 'Total de litros deve ser maior que zero.' })
  @IsNotEmpty({ message: 'Total de litros é obrigatório.' })
  totalLitros: number;

  @IsInt()
  @Min(0)
  @IsNotEmpty({ message: 'Quilometragem é obrigatória.' })
  quilometragem: number;

  @IsEnum(TipoCombustivel, { message: 'Tipo de combustível inválido.' })
  @IsNotEmpty({ message: 'Tipo de combustível é obrigatório.' })
  tipoCombustivel: TipoCombustivel;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsString()
  localDescricao?: string;

  @IsOptional()
  @IsString()
  postoIdentificado?: string;

  @IsOptional()
  @IsString()
  imagemUrl?: string;

  @IsOptional()
  @IsString()
  observacao?: string;
}