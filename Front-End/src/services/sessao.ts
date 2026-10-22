import { queryClient } from '@/utils/queryClient';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

export type MotivoSaida = 'sessao-expirada' | 'senha-alterada';

// Apaga a sessao so no aparelho (token, usuario e dados em cache); quem chama decide se avisa o servidor e para onde navegar.
export async function encerrarSessaoLocal(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token'),
    SecureStore.deleteItemAsync(process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user'),
  ]);
  queryClient.clear();
}

// Esvazia a pilha antes de ir para a tela inicial, para o voltar (do cabecalho ou do Android) nao reabrir telas da sessao encerrada.
// Com motivo, abre o login por cima da tela inicial, e o voltar do login leva a ela.
export function voltarAoInicio(motivo?: MotivoSaida): void {
  if (router.canDismiss()) {
    router.dismissAll();
  }
  router.replace('/');
  if (motivo) {
    router.push(`/login?motivo=${motivo}`);
  }
}
