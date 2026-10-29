import { api, liberarRedirecionamentoTermo } from "./api";
import * as SecureStore from "expo-secure-store";

export interface TermoUso {
  id: number;
  versao: string;
  conteudo: string;
  publicadoEm: string;
}

export interface AceiteTermoLocal {
  versao: string;
  aceitoEm: string;
  userId?: number;
}

const CHAVE_ACEITE_LOCAL = "rodabem_termo_aceite";

export async function getTermoVigente(): Promise<TermoUso> {
  const response = await api.get<TermoUso>("/termos/vigente");
  return response.data;
}

export async function guardarAceiteLocal(
  versao: string,
  userId?: number,
  aceitoEm = new Date().toISOString(),
) {
  await SecureStore.setItemAsync(
    CHAVE_ACEITE_LOCAL,
    JSON.stringify({ versao, aceitoEm, userId } satisfies AceiteTermoLocal),
  );
}

export async function getAceiteLocal(userId?: number): Promise<AceiteTermoLocal | null> {
  const valor = await SecureStore.getItemAsync(CHAVE_ACEITE_LOCAL);
  if (!valor) return null;
  try {
    const aceite = JSON.parse(valor) as AceiteTermoLocal;
    if (!aceite.versao || !aceite.aceitoEm) return null;
    if (userId !== undefined && aceite.userId !== userId) return null;
    return aceite;
  } catch {
    return null;
  }
}

export async function aceitarTermo(termoVersao: string, userId?: number): Promise<void> {
  await api.post("/termos/aceite", { termoVersao });
  // A API atual confirma o aceite, mas não devolve aceitoEm. Guardamos a data local
  // apenas para transparência no aparelho, sem enviá-la como prova ao servidor.
  try {
    await guardarAceiteLocal(termoVersao, userId);
  } catch {
    // O aceite ja esta confirmado no servidor; a copia local serve apenas para consulta.
  } finally {
    liberarRedirecionamentoTermo();
  }
}
