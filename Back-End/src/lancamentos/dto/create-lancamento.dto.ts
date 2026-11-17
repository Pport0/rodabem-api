import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export enum TipoLancamento {
  RECEITA = 'RECEITA',
  DESPESA = 'DESPESA',
}

export enum CategoriaLancamento {
  FRETE       = 'FRETE',
  PEDAGIO     = 'PEDAGIO',
  MANUTENCAO  = 'MANUTENCAO',
  ALIMENTACAO = 'ALIMENTACAO',
  PERNOITE    = 'PERNOITE',
  OUTROS      = 'OUTROS',
}

const CATEGORIAS_RECEITA = [CategoriaLancamento.FRETE, CategoriaLancamento.OUTROS];
const CATEGORIAS_DESPESA = [
  CategoriaLancamento.PEDAGIO,
  CategoriaLancamento.MANUTENCAO,
  CategoriaLancamento.ALIMENTACAO,
  CategoriaLancamento.PERNOITE,
  CategoriaLancamento.OUTROS,
];

export class CreateLancamentoDto {
  @IsEnum(TipoLancamento)
  tipo: TipoLancamento;

  @IsEnum(CategoriaLancamento)
  categoria: CategoriaLancamento;

  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive({ message: 'O valor deve ser maior que zero.' })
  valor: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  descricao?: string;

  @ValidateIf(() => false)
  _categoriaValida?: never;
}

export function validarCategoriaParaTipo(
  tipo: TipoLancamento,
  categoria: CategoriaLancamento,
): boolean {
  if (tipo === TipoLancamento.RECEITA) return CATEGORIAS_RECEITA.includes(categoria);
  if (tipo === TipoLancamento.DESPESA) return CATEGORIAS_DESPESA.includes(categoria);
  return false;
}
