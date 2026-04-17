import { api } from "./api";
import { Caminhao, CreateCaminhaoDto, UpdateCaminhaoDto } from "@/@types/caminhao";

export async function getMeuCaminhao(): Promise<Caminhao> {
    const response = await api.get<Caminhao>('/caminhao');
    return response.data;
}

export async function getCaminhao(id: number): Promise<Caminhao> {
    const response = await api.get<Caminhao>(`/caminhao/${id}`);
    return response.data;
}

export async function createCaminhao(caminhao: CreateCaminhaoDto): Promise<Caminhao> {
    const response = await api.post<Caminhao>(`/caminhao`, caminhao);
    return response.data;
}

export async function updateCaminhao(id: number, caminhao: UpdateCaminhaoDto): Promise<Caminhao> {  
    const response = await api.put<Caminhao>(`/caminhao/${id}`, caminhao);
    return response.data;
}

export async function deleteCaminhao(id: number): Promise<void> {
    await api.delete(`/caminhao/${id}`);
}