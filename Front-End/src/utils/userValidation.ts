export interface PerfilFormErrors {
  nome?: string;
  email?: string;
  telefone?: string;
}

export interface PerfilFormValues {
  nome: string;
  email: string;
  telefone: string;
}

// Regra unica de e-mail para cadastro e edicao do perfil (RNE-01, #50).
export function validateEmail(email: string): string | undefined {
  const emailValue = email.trim();
  if (!emailValue) return "Email é obrigatório";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) return "Email inválido";
  return undefined;
}

export function validatePerfil({ nome, email, telefone }: PerfilFormValues): PerfilFormErrors {
  const errors: PerfilFormErrors = {};
  const telefoneDigits = telefone.replace(/\D/g, "");

  if (!nome.trim()) errors.nome = "Nome completo é obrigatório";
  const emailError = validateEmail(email);
  if (emailError) errors.email = emailError;
  // Telefone e opcional (RNE-01), mas se informado tem que estar completo.
  if (telefoneDigits && telefoneDigits.length < 10) errors.telefone = "Telefone inválido";

  return errors;
}
