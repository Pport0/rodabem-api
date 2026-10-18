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
  @IsIn([2, 3, 4, 5, 6, 7, 9], { message: 'Número de eixos inválido. Valores aceitos: 2, 3, 4, 5, 6, 7, 9.' })
  numeroEixos?: number;
}