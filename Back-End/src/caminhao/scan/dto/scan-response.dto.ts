export class ScanResponseDto {
  arquivoUrl: string;
  publicId: string;
  dadosExtraidos: {
    placa?: string;
    modelo?: string;
    renavam?: string;
    crv?: string;
    marca?: string;
    especieTipo?: string;
    chassi?: string;
    cor?: string;
    anoFabricacao?: number;
  };
  camposObrigatoriosFaltando: string[];
  confianca: 'alta' | 'media' | 'baixa';
  mensagem: string;
}