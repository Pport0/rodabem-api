import { IsEnum, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';
import { CategoriaLancamento, TipoLancamento } from './create-lancamento.dto';

export class UpdateLancamentoDto {
  @IsOptional()
  @IsEnum(TipoLancamento)
  tipo?: TipoLancamento;

  @IsOptional()
  @IsEnum(CategoriaLancamento)
  categoria?: CategoriaLancamento;

  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'O valor deve ser maior que zero.' })
  valor?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao?: string;
}
