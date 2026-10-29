import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { encerrarSessaoLocal, voltarAoInicio } from './sessao';
import { router } from 'expo-router';

export const api = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL,
  timeout: 60000,
});

api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync(
    process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token'
  );
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Varias requisicoes podem cair juntas com 401; so a primeira encerra a sessao e redireciona. Volta a valer apos um novo login.
let sessaoEncerrada = false;
let redirecionandoTermo = false;

export function liberarRedirecionamentoTermo() {
  redirecionandoTermo = false;
}

api.interceptors.response.use(
  (response) => {
    if (response?.config?.url?.includes('/auth/login')) {
      sessaoEncerrada = false;
    }
    return response;
  },
  async (error) => {
    if (__DEV__) {
      console.error('[API Error]', error?.config?.url, error?.message);
    }
    if (error?.response?.status === 403 && error?.response?.data?.code === 'TERMO_PENDENTE') {
      if (!redirecionandoTermo) {
        redirecionandoTermo = true;
        router.replace('/termo-pendente');
      }
    }
    // O 401 das rotas /auth/ (senha errada no login, logout com token ja invalidado) nao significa que a sessao caiu.
    const url: string = error?.config?.url ?? '';
    if (error?.response?.status === 401 && !url.includes('/auth/') && !sessaoEncerrada) {
      const token = await SecureStore.getItemAsync(
        process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token'
      );
      // Uma consulta disparada antes de resolver a autenticacao (por exemplo, na home
      // durante a inicializacao) nao deve parecer uma sessao expirada inexistente.
      if (token && !sessaoEncerrada) {
        sessaoEncerrada = true;
        await encerrarSessaoLocal();
        voltarAoInicio('sessao-expirada');
      }
    }
    return Promise.reject(error);
  }
);
