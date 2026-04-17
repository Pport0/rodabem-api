import { api } from "./api";
import { Documento } from "@/@types/documento";
import { CreateDocumentoDto } from "@/@types/documento";
import { UpdateDocumentoDto } from "@/@types/documento";

export async function getDocumentos(): Promise<Documento[]> {
  const response = await api.get<Documento[]>(`/documentos`);
  return response.data;
}

export async function createDocumento(documento: CreateDocumentoDto): Promise<Documento> {
  const response = await api.post<Documento>(`/documentos`, documento);
  return response.data;
}

export async function updateDocumento(id: number, documento: UpdateDocumentoDto): Promise<Documento> {
  const response = await api.put<Documento>(`/documentos/${id}`, documento);
  return response.data;
}

export async function deleteDocumento(id: number): Promise<void> {
  await api.delete(`/documentos/${id}`);
}