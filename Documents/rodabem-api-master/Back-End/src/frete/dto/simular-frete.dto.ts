import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TipoCarga } from '@prisma/client';

export class SimularFreteDto {
  @IsString()
  @IsNotEmpty({ message: 'Origem é obrigatória.' })
  origem: string;

  @IsString()
  @IsNotEmpty({ message: 'Destino é obrigatório.' })
  destino: string;

  @IsOptional()
  @IsString({ each: true })
  paradasIntermediarias?: string[];

  @IsEnum(TipoCarga, { message: 'Tipo de carga inválido.' })
  tipoCarga: TipoCarga;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  consumoMedioKmLOverride?: number; 

  @IsNumber()
  @Min(0.01, { message: 'Preço do combustível deve ser maior que zero.' })
  precoCombustivel: number;

    @IsOptional()
  @IsNumber()
  @Min(0, { message: 'Valor de pedágios não pode ser negativo.' })
  pedagiosManual?: number; 

  @IsOptional()
  @IsBoolean()
  retornoVazio?: boolean;

  @IsOptional()
  @IsBoolean()
  altoDesempenho?: boolean;
}