import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';

export class CreateDocumentoDto {
  @IsString()
  @IsNotEmpty({ message: 'Nome do documento é obrigatório.' })
  nome: string;

  @IsString()
  @IsNotEmpty({ message: 'Número do documento é obrigatório.' })
  numero: string;

  @IsString()
  @IsNotEmpty({ message: 'Data de emissão é obrigatória.' })
  dataEmissao: string;

  @IsString()
  @IsNotEmpty({ message: 'Data de vencimento é obrigatória.' })
  dataVencimento: string;

  @IsOptional()
  @IsString()
  observacao?: string;

  @IsOptional()
  @IsString()
  arquivoUrl?: string;

  @IsOptional()
  @IsString()
  publicId?: string;

  @IsOptional()
  @IsInt()
  caminhaoId?: number;
}