import { Lancamento, LancamentoInput, LancamentoRelatorio } from "@/@types/lancamento";
import { api } from "./api";

export async function getRelatorioLancamentos(periodo: {
  dataInicio: string;
  dataFim: string;
}): Promise<LancamentoRelatorio> {
  const response = await api.get<LancamentoRelatorio>("/lancamentos/relatorio", {
    params: periodo,
  });
  return response.data;
}

export async function getLancamento(id: number): Promise<Lancamento> {
  const response = await api.get<Lancamento>(`/lancamentos/${id}`);
  return response.data;
}

export async function createLancamento(data: LancamentoInput): Promise<Lancamento> {
  const response = await api.post<Lancamento>("/lancamentos", data);
  return response.data;
}

export async function updateLancamento(id: number, data: Partial<LancamentoInput>): Promise<Lancamento> {
  const response = await api.patch<Lancamento>(`/lancamentos/${id}`, data);
  return response.data;
}

export async function deleteLancamento(id: number): Promise<void> {
  await api.delete(`/lancamentos/${id}`);
}
