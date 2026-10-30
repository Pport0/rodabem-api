// `QueryClient` de teste precisa sempre de `gcTime: 0`. O padrao do react-query e cinco
// minutos, e ao desmontar a tela ele agenda um `setTimeout` desse tamanho que segura o
// processo do Node — a suite termina, imprime o resultado e nao sai.

import '@testing-library/react-native';

// Icons are visual-only in component tests; mock them to avoid loading Expo's font/asset runtime.
jest.mock('@expo/vector-icons/Ionicons', () => {
  const React = require('react');
  const { Text } = require('react-native');
  return { __esModule: true, default: ({ name }: { name: string }) => React.createElement(Text, null, name) };
});
jest.mock('@expo/vector-icons/FontAwesome', () => ({ __esModule: true, default: { font: {} } }));

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
    getItem: jest.fn((chave: string) => memoria.get(chave) ?? null),
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
    dismissAll: jest.fn(),
    canDismiss: jest.fn(() => false),
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

