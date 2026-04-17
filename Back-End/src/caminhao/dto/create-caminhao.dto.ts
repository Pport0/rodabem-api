import {
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
  @IsInt({ message: 'Número de eixos deve ser um número inteiro.' })
  @Min(2, { message: 'Número mínimo de eixos é 2.' })
  @Max(9, { message: 'Número máximo de eixos é 9.' })
  numeroEixos?: number; // 👈 adicionar
}