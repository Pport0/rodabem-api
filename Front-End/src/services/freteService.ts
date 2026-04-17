import {
  HistoricoFreteItem,
  SimularFreteDto,
  SimulacaoFreteResponse,
} from "@/@types/frete";
import { api } from "./api";

export async function simularFrete(
  payload: SimularFreteDto
): Promise<SimulacaoFreteResponse> {
  const response = await api.post<SimulacaoFreteResponse>("/frete/simular", payload);
  return response.data;
}

export async function getHistoricoFrete(): Promise<HistoricoFreteItem[]> {
  const response = await api.get<HistoricoFreteItem[]>("/frete/historico");
  return response.data;
}
