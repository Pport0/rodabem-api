export class CreateDocumentoDto {
  nome: string;
  numero: string;

  dataEmissao: string;
  dataVencimento: string;

  observacao?: string;
  arquivoUrl?: string;

  caminhaoId?: number;
  motoristaId?: number;
}