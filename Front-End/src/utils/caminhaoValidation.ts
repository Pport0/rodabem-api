export interface CaminhaoFormErrors {
  placa?: string;
  modelo?: string;
  renavam?: string;
  numeroEixos?: string;
}

export interface CaminhaoFormValues {
  placa: string;
  modelo: string;
  renavam: string;
  numeroEixos: string;
}

// Regra unica para cadastro e edicao do caminhao (#50).
export function validateCaminhao({
  placa,
  modelo,
  renavam,
  numeroEixos,
}: CaminhaoFormValues): CaminhaoFormErrors {
  const errors: CaminhaoFormErrors = {};
  const numeroEixosValue = Number(numeroEixos);

  if (!placa.trim() || placa.replace(/[^A-Z0-9]/g, "").length < 7) {
    errors.placa = "Placa invalida (ex: ABC1234 ou ABC1D23)";
  }
  if (!modelo.trim()) errors.modelo = "Modelo e obrigatorio";
  if (!renavam.trim() || renavam.replace(/\D/g, "").length < 9) {
    errors.renavam = "RENAVAM invalido";
  }
  if (!numeroEixos.trim()) {
    errors.numeroEixos = "Numero de eixos e obrigatorio";
  } else if (!Number.isInteger(numeroEixosValue) || numeroEixosValue < 2) {
    errors.numeroEixos = "Informe um numero de eixos valido";
  }

  return errors;
}
