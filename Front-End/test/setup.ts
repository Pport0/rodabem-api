/**
 * Setup compartilhado das suites do Front-End.
 *
 * Concentra os dublês de modulos nativos do Expo que nao existem no ambiente de teste (Node). Cada suite ainda pode sobrescrever o comportamento por teste usando `jest.mocked(...)`.
 */

import '@testing-library/react-native';

// Armazenamento seguro: substituido por um mapa em memoria, para que os testes possam inspecionar e limpar o que foi gravado.
jest.mock('expo-secure-store', () => {
  const memoria = new Map<string, string>();
  return {
    __memoria: memoria,
    setItem: jest.fn((chave: string, valor: string) => {
      memoria.set(chave, valor);
    }),
    setItemAsync: jest.fn(async (chave: string, valor: string) => {
      memoria.set(chave, valor);
    }),
    getItemAsync: jest.fn(async (chave: string) => memoria.get(chave) ?? null),
    deleteItemAsync: jest.fn(async (chave: string) => {
      memoria.delete(chave);
    }),
  };
});

// Navegacao: apenas registra para onde foi pedido para navegar.
jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  },
  useRouter: () => ({
    push: jest.fn(),
    navigate: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
  Link: 'Link',
}));

// Reanimated nao roda no ambiente de teste; o mock oficial da biblioteca substitui as animacoes por valores estaticos.
jest.mock('react-native-reanimated', () =>
  require('react-native-reanimated/mock'),
);

// `__DEV__` e injetado pelo Metro; no Jest precisa ser declarado.
(global as any).__DEV__ = true;

beforeEach(() => {
  jest.clearAllMocks();
});

