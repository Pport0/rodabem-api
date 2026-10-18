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

export interface AlertaVencimento {
  id: number;
  nome: string;
  numero: string;
  dataVencimento: string;
  caminhaoId?: number | null;
  vinculo: DocumentoVinculo;
  diasRestantes: number;
}

export interface AlertasVencimentoResponse {
  alertas: AlertaVencimento[];
  mensagem: string;
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
