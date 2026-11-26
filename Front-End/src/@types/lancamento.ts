export type TipoLancamento = "RECEITA" | "DESPESA";

export type CategoriaLancamento =
  | "FRETE"
  | "PEDAGIO"
  | "MANUTENCAO"
  | "ALIMENTACAO"
  | "PERNOITE"
  | "OUTROS";

export interface Lancamento {
  id: number;
  tipo: TipoLancamento;
  categoria: CategoriaLancamento;
  valor: number;
  descricao?: string | null;
  data: string;
  userId?: number;
  caminhaoId?: number;
}

export interface LancamentoInput {
  tipo: TipoLancamento;
  categoria: CategoriaLancamento;
  valor: number;
  descricao?: string;
}

export interface LancamentoHistoricoItem {
  id: number;
  tipo: TipoLancamento;
  categoria: CategoriaLancamento | "COMBUSTIVEL";
  valor: number;
  descricao?: string | null;
  data: string;
  origem: "lancamento" | "abastecimento";
}

export interface LancamentoRelatorio {
  periodo: { dataInicio: string | null; dataFim: string | null };
  totalReceitas: number;
  totalDespesas: number;
  totalCombustivel: number;
  saldo: number;
  porCategoria: Record<string, number>;
  historico: LancamentoHistoricoItem[];
}
