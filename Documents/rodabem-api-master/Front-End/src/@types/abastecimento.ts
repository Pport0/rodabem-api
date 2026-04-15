export type TipoCombustivel = "DIESEL_S10" | "DIESEL_S500" | "ARLA_32";

export interface Abastecimento {
  id: number;
  precoPorLitro: number;
  totalLitros: number;
  valorTotal: number;
  quilometragem: number;
  tipoCombustivel: TipoCombustivel;
  dataAbastecimento: string;
  latitude?: number;
  longitude?: number;
  localDescricao?: string;
  postoIdentificado?: string;
  imagemUrl?: string;
  observacao?: string;
  caminhaoId: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAbastecimentoDto {
  precoPorLitro: number;
  totalLitros: number;
  quilometragem: number;
  tipoCombustivel: TipoCombustivel;
  latitude?: number;
  longitude?: number;
  localDescricao?: string;
  postoIdentificado?: string;
  imagemUrl?: string;
  observacao?: string;
}

export interface UpdateAbastecimentoDto extends Partial<CreateAbastecimentoDto> {}

export interface MediaConsumoResponse {
  mediaConsumo: number | null;
  unidade: string;
  mensagem: string;
  totalAbastecimentos: number;
  totalTrechosCalculados?: number;
}
