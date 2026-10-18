export interface DocumentoFormErrors {
  nome?: string;
  numero?: string;
  dataEmissao?: string;
  dataVencimento?: string;
}

export interface DocumentoFormValues {
  nome: string;
  numero: string;
  dataEmissao: Date | null;
  dataVencimento: Date | null;
}

// Regra unica para cadastro e edicao do documento (#50).
export function validateDocumento({
  nome,
  numero,
  dataEmissao,
  dataVencimento,
}: DocumentoFormValues): DocumentoFormErrors {
  const errors: DocumentoFormErrors = {};

  if (!nome.trim()) errors.nome = "Nome do documento e obrigatorio";
  if (!numero.trim()) errors.numero = "Numero e obrigatorio";
  if (!dataEmissao) errors.dataEmissao = "Data de emissao obrigatoria";
  if (!dataVencimento) {
    errors.dataVencimento = "Data de vencimento obrigatoria";
  }
  if (dataEmissao && dataVencimento && dataVencimento < dataEmissao) {
    errors.dataVencimento =
      "A data de vencimento nao pode ser anterior a emissao";
  }

  return errors;
}
