export type TipoCarga =
  | "GERAL"
  | "GRANEL_SOLIDO"
  | "GRANEL_LIQUIDO"
  | "FRIGORIFICADA"
  | "PERIGOSA"
  | "CONTEINER";

export type ComposicaoVeicular = "COM_CARRETA" | "SEM_CARRETA";

export interface SimularFreteDto {
  origem: string;
  destino: string;
  paradasIntermediarias?: string[];
  tipoCarga: TipoCarga;
  consumoMedioKmLOverride?: number;
  precoCombustivel: number;
  pedagiosManual?: number;
  retornoVazio?: boolean;
  altoDesempenho?: boolean;
  composicaoVeicular?: ComposicaoVeicular;
  percentualLucroDesejado?: number;
}

export interface SimulacaoFreteResponse {
  simulacaoId: number;
  origem: string;
  destino: string;
  distanciaKm: number;
  duracaoMinutos: number;
  pedagiosEstimados: number;
  consumoMedioKmL: number;
  litrosNecessarios: number;
  custoCombustivel: number;
  tipoCarga: TipoCarga;
  retornoVazio: boolean;
  altoDesempenho: boolean;
  valorMinimoAntt: number;
  valorLiquidoEstimado: number;
  abaixoMinimoAntt: boolean;
  custoTotal: number;
  percentualLucroDesejado: number | null;
  valorSugerido: number | null;
  sugeridoAbaixoDoMinimo: boolean | null;
  aviso: string | null;
}

export interface HistoricoFreteItem {
  id: number;
  origem: string;
  destino: string;
  distanciaKm: number;
  pedagiosEstimados: number;
  consumoMedioKmL: number;
  precoCombustivel: number;
  litrosNecessarios: number;
  custoCombustivel: number;
  tipoCarga: TipoCarga;
  retornoVazio: boolean;
  altoDesempenho: boolean;
  valorMinimoAntt: number;
  valorLiquidoEstimado: number;
  createdAt: string;
}
