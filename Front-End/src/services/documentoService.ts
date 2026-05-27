import { Documento, CreateDocumentoDto, UpdateDocumentoDto } from "@/@types/documento";
import { DocumentoScanResponse } from "@/@types/scan";
import { api } from "./api";

type DocumentoApiResponse =
  | Documento
  | {
      message: string;
      documento?: Documento;
    };

function extractDocumento(data: DocumentoApiResponse): Documento | null {
  if ("nome" in data) return data;
  return data.documento ?? null;
}

export async function getDocumentos(): Promise<Documento[]> {
  const response = await api.get<Documento[]>("/documentos");
  return response.data;
}

export async function createDocumento(
  documento: CreateDocumentoDto
): Promise<Documento | null> {
  const response = await api.post<DocumentoApiResponse>("/documentos", documento);
  return extractDocumento(response.data);
}

export async function updateDocumento(
  id: number,
  documento: UpdateDocumentoDto
): Promise<Documento | null> {
  const response = await api.put<DocumentoApiResponse>(`/documentos/${id}`, documento);
  return extractDocumento(response.data);
}

export async function deleteDocumento(id: number): Promise<void> {
  await api.delete(`/documentos/${id}`);
}

export async function scanDocumento(file: {
  uri: string;
  name: string;
  type: string;
}): Promise<DocumentoScanResponse> {
  const formData = new FormData();
  formData.append("documento", {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as any);

  const response = await api.post<DocumentoScanResponse>("/documentos/scan", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
}
