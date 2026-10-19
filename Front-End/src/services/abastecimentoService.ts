import {
  Abastecimento,
  CreateAbastecimentoDto,
  MediaConsumoResponse,
  UpdateAbastecimentoDto,
} from "@/@types/abastecimento";
import { HodometroScanResponse } from "@/@types/scan";
import { api } from "./api";

export async function getAbastecimentos(): Promise<Abastecimento[]> {
  const response = await api.get<Abastecimento[]>("/abastecimentos");
  return response.data;
}

export async function getAbastecimento(id: number): Promise<Abastecimento> {
  const response = await api.get<Abastecimento>(`/abastecimentos/${id}`);
  return response.data;
}

export async function createAbastecimento(
  abastecimento: CreateAbastecimentoDto
): Promise<Abastecimento> {
  const response = await api.post<Abastecimento>("/abastecimentos", abastecimento);
  return response.data;
}

export async function updateAbastecimento(
  id: number,
  abastecimento: UpdateAbastecimentoDto
): Promise<Abastecimento> {
  const response = await api.patch<Abastecimento>(`/abastecimentos/${id}`, abastecimento);
  return response.data;
}

export async function deleteAbastecimento(id: number): Promise<void> {
  await api.delete(`/abastecimentos/${id}`);
}

export async function getMediaConsumo(): Promise<MediaConsumoResponse> {
  const response = await api.get<MediaConsumoResponse>("/abastecimentos/media-consumo");
  return response.data;
}

export async function scanHodometro(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<HodometroScanResponse> {
  const formData = new FormData();
  formData.append("imagem", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const response = await api.post<HodometroScanResponse>("/abastecimentos/scan", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
