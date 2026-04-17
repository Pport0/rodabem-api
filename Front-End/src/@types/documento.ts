export interface Documento {
  id?: number;
  nome: string;
  numero: string;
  dataEmissao: string;
  dataVencimento: string;
  observacao?: string;
  arquivoUrl?: string;
  motoristaId?: number;
  caminhaoId?: number;
}

export interface CreateDocumentoDto {
  id?: number;
  nome: string;
  numero: string;
  dataEmissao: string;
  dataVencimento: string;
  observacao?: string;
  arquivoUrl?: string;
  motoristaId?: number;
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