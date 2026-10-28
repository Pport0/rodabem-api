import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateCaminhaoDto {
  @IsString()
  @IsNotEmpty({ message: 'Placa é obrigatória.' })
  placa: string;

  @IsString()
  @IsNotEmpty({ message: 'Modelo é obrigatório.' })
  modelo: string;

  @IsString()
  @IsNotEmpty({ message: 'RENAVAM é obrigatório.' })
  renavam: string;

  @IsOptional()
  @IsString()
  crv?: string;

  @IsOptional()
  @IsString()
  marca?: string;

  @IsOptional()
  @IsString()
  especieTipo?: string;

  @IsOptional()
  @IsString()
  chassi?: string;

  @IsOptional()
  @IsString()
  cor?: string;

  @IsOptional()
  @IsInt()
  anoFabricacao?: number;

  @IsOptional()
  @IsInt()
  @Min(2, { message: 'Número de eixos deve ser pelo menos 2.' })
  @Max(20, { message: 'Número de eixos deve ser no máximo 20.' })
  numeroEixos?: number;
}