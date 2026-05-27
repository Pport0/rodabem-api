export type DocumentoVinculo = 'CAMINHAO' | 'MOTORISTA';

export interface Documento {
  id?: number;
  nome: string;
  numero: string;
  dataEmissao: string;
  dataVencimento: string;
  observacao?: string;
  arquivoUrl?: string;
  vinculo?: DocumentoVinculo;
  status?: string;
  diasRestantes?: number;
  caminhaoId?: number | null;
}

export interface CreateDocumentoDto {
  id?: number;
  nome: string;
  numero: string;
  dataEmissao: string;
  dataVencimento: string;
  observacao?: string;
  arquivoUrl?: string;
  caminhaoId?: number;
}

export interface UpdateDocumentoDto {
  nome?: string;
  numero?: string;
  dataEmissao?: string;
  dataVencimento?: string;
  observacao?: string;
  arquivoUrl?: string;
}
