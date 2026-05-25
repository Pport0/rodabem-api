export class ScanDocumentoResponseDto {
  arquivoUrl: string;
  publicId: string;
  dadosExtraidos: {
    nome?: string;
    numero?: string;
    dataEmissao?: string;
    dataVencimento?: string;
    observacao?: string;
  };
  camposObrigatoriosFaltando: string[];
  confianca: 'alta' | 'media' | 'baixa';
  mensagem: string;
}