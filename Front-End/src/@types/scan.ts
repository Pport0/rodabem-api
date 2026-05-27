export interface TruckScanResponse {
  arquivoUrl: string;
  publicId: string;
  dadosExtraidos: {
    placa?: string | null;
    modelo?: string | null;
    renavam?: string | null;
    crv?: string | null;
    marca?: string | null;
    especieTipo?: string | null;
    chassi?: string | null;
    cor?: string | null;
    anoFabricacao?: number | null;
  };
  camposObrigatoriosFaltando: string[];
  confianca: 'alta' | 'media' | 'baixa';
  mensagem: string;
}

export interface DocumentoScanResponse {
  arquivoUrl: string;
  publicId: string;
  dadosExtraidos: {
    nome?: string | null;
    numero?: string | null;
    dataEmissao?: string | null;
    dataVencimento?: string | null;
    observacao?: string | null;
  };
  camposObrigatoriosFaltando: string[];
  confianca: 'alta' | 'media' | 'baixa';
  mensagem: string;
}
