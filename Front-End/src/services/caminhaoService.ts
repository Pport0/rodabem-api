import { Caminhao, CreateCaminhaoDto, UpdateCaminhaoDto } from "@/@types/caminhao";
import { TruckScanResponse } from "@/@types/scan";
import { api } from "./api";

type CaminhaoApiResponse =
  | Caminhao
  | {
      message: string;
      caminhao?: Caminhao;
    };

function extractCaminhao(data: CaminhaoApiResponse): Caminhao | null {
  if ("placa" in data) return data;
  return data.caminhao ?? null;
}

export async function getMeuCaminhao(): Promise<Caminhao | null> {
  const response = await api.get<CaminhaoApiResponse>("/caminhao");
  return extractCaminhao(response.data);
}

export async function createCaminhao(
  caminhao: CreateCaminhaoDto
): Promise<Caminhao | null> {
  const response = await api.post<CaminhaoApiResponse>("/caminhao", caminhao);
  return extractCaminhao(response.data);
}

export async function updateCaminhao(
  caminhao: UpdateCaminhaoDto
): Promise<Caminhao | null> {
  const response = await api.put<CaminhaoApiResponse>("/caminhao", caminhao);
  return extractCaminhao(response.data);
}

export async function deleteCaminhao(): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>("/caminhao");
  return response.data;
}

export async function scanCaminhao(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<TruckScanResponse> {
  const formData = new FormData();
  formData.append("documento", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const response = await api.post<TruckScanResponse>("/caminhao/scan", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
