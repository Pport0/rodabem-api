import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

function getExpoHostIp() {
  const hostCandidates = [
    Constants.expoGoConfig?.debuggerHost,
    (Constants as any).manifest?.debuggerHost,
    (Constants as any).manifest2?.extra?.expoClient?.hostUri,
    (Constants as any).manifest?.hostUri,
    Constants.expoConfig?.hostUri,
  ];

  for (const candidate of hostCandidates) {
    if (typeof candidate !== 'string') continue;

    const host = candidate.split(':')[0]?.trim();
    if (host && /^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
      return host;
    }
  }

  return null;
}

function resolveApiBaseUrl() {
  const rawBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  const sanitizedBaseUrl = rawBaseUrl?.split(/\s+/)[0]?.replace(/\/$/, '');

  if (!sanitizedBaseUrl) {
    if (__DEV__) {
      console.warn(
        '[API] Defina EXPO_PUBLIC_API_BASE_URL no .env para conseguir acessar o back-end.'
      );
    }
    return undefined;
  }

  try {
    const url = new URL(sanitizedBaseUrl);

    if (url.hostname === '10.0.2.2') {
      const expoHostIp = getExpoHostIp();

      if (expoHostIp) {
        url.hostname = expoHostIp;

        if (__DEV__) {
          console.log(
            `[API] Usando ${url.toString()} para permitir acesso pelo Expo Go no dispositivo fisico.`
          );
        }

        return url.toString().replace(/\/$/, '');
      }

      if (__DEV__) {
        console.warn(
          '[API] 10.0.2.2 funciona no emulador Android. No celular fisico, troque EXPO_PUBLIC_API_BASE_URL pelo IP local da sua maquina.'
        );
      }
    }

    return url.toString().replace(/\/$/, '');
  } catch {
    if (__DEV__) {
      console.warn(
        `[API] EXPO_PUBLIC_API_BASE_URL invalida: "${rawBaseUrl}". Verifique o .env.`
      );
    }
    return sanitizedBaseUrl;
  }
}

export const api = axios.create({
  baseURL: resolveApiBaseUrl(),
  timeout: 10000,
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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (__DEV__) {
      console.error('[API Error]', error?.config?.url, error?.message);
    }
    return Promise.reject(error);
  }
);
