import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

// Mesmo axios de mentira do api.test.ts: so guarda os interceptores registrados, para chama-los direto.
jest.mock('axios', () => {
  const handlersRequisicao: any[] = [];
  const handlersResposta: any[] = [];
  const instancia = {
    defaults: {} as Record<string, unknown>,
    interceptors: {
      request: {
        handlers: handlersRequisicao,
        use: (fulfilled: any, rejected?: any) => handlersRequisicao.push({ fulfilled, rejected }),
      },
      response: {
        handlers: handlersResposta,
        use: (fulfilled: any, rejected?: any) => handlersResposta.push({ fulfilled, rejected }),
      },
    },
  };
  return { __esModule: true, default: { create: jest.fn(() => instancia) } };
});
jest.mock('@/utils/queryClient', () => ({ queryClient: { clear: jest.fn() } }));

// eslint-disable-next-line import/first
import { api } from '../api';
// eslint-disable-next-line import/first
import { queryClient } from '@/utils/queryClient';

const CHAVE_TOKEN = process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token';
const CHAVE_USUARIO = process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user';
const memoria: Map<string, string> = (SecureStore as any).__memoria;

const interceptorDeResposta = () => {
  const handler = (api.interceptors.response as any).handlers[0];
  return { sucesso: handler.fulfilled, erro: handler.rejected };
};

const erroHttp = (status: number, url: string) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    config: { url },
    response: { status, data: {} },
  });

// Um login bem-sucedido libera o interceptor para tratar uma nova queda de sessao.
const entrarDeNovo = () =>
  interceptorDeResposta().sucesso({ status: 200, config: { url: '/auth/login' }, data: {} });

let consoleError: jest.SpyInstance;

beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  entrarDeNovo();
  memoria.set(CHAVE_TOKEN, 'jwt-token');
  memoria.set(CHAVE_USUARIO, JSON.stringify({ id: 1, nome: 'Gabriel' }));
});

afterEach(() => consoleError.mockRestore());

describe('401 em rota protegida', () => {
  it('nao deve encerrar sessao nem redirecionar quando ainda nao existe credencial', async () => {
    memoria.delete(CHAVE_TOKEN);
    const erro = erroHttp(401, '/documentos/alertas');

    await expect(interceptorDeResposta().erro(erro)).rejects.toBe(erro);

    expect(memoria.has(CHAVE_TOKEN)).toBe(false);
    expect(memoria.has(CHAVE_USUARIO)).toBe(true);
    expect(queryClient.clear).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('deve encerrar a sessao local e levar ao login com o aviso de sessao expirada', async () => {
    const erro = erroHttp(401, '/users/me');

    await expect(interceptorDeResposta().erro(erro)).rejects.toBe(erro);

    expect(memoria.has(CHAVE_TOKEN)).toBe(false);
    expect(memoria.has(CHAVE_USUARIO)).toBe(false);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
    expect(router.replace).toHaveBeenCalledWith('/');
    expect(router.push).toHaveBeenCalledWith('/login?motivo=sessao-expirada');
  });

  it('deve redirecionar uma vez so quando varias requisicoes falham juntas', async () => {
    const erros = ['/caminhoes', '/documentos', '/abastecimentos'].map((url) => erroHttp(401, url));

    await Promise.allSettled(erros.map((erro) => interceptorDeResposta().erro(erro)));

    expect(router.replace).toHaveBeenCalledTimes(1);
    expect(router.push).toHaveBeenCalledTimes(1);
    expect(queryClient.clear).toHaveBeenCalledTimes(1);
  });

  it('deve voltar a redirecionar se a sessao cair de novo depois de um novo login', async () => {
    await interceptorDeResposta().erro(erroHttp(401, '/caminhoes')).catch(() => {});
    entrarDeNovo();
    memoria.set(CHAVE_TOKEN, 'jwt-token');
    await interceptorDeResposta().erro(erroHttp(401, '/caminhoes')).catch(() => {});

    expect(router.replace).toHaveBeenCalledTimes(2);
  });
});

describe('401 nas rotas de autenticacao', () => {
  it.each(['/auth/login', '/auth/logout', '/auth/forgot-password', '/auth/reset-password'])(
    'nao deve encerrar a sessao nem redirecionar em %s',
    async (url) => {
      const erro = erroHttp(401, url);

      await expect(interceptorDeResposta().erro(erro)).rejects.toBe(erro);

      expect(memoria.get(CHAVE_TOKEN)).toBe('jwt-token');
      expect(queryClient.clear).not.toHaveBeenCalled();
      expect(router.replace).not.toHaveBeenCalled();
    },
  );
});

describe('outros status', () => {
  it.each([400, 403, 404, 500])('nao deve mexer na sessao com status %i', async (status) => {
    const erro = erroHttp(status, '/users/me/senha');

    await expect(interceptorDeResposta().erro(erro)).rejects.toBe(erro);

    expect(memoria.get(CHAVE_TOKEN)).toBe('jwt-token');
    expect(memoria.has(CHAVE_USUARIO)).toBe(true);
    expect(queryClient.clear).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('nao deve mexer na sessao quando a requisicao falha sem resposta (sem rede)', async () => {
    const erro = Object.assign(new Error('Network Error'), { config: { url: '/caminhoes' } });

    await expect(interceptorDeResposta().erro(erro)).rejects.toBe(erro);

    expect(memoria.get(CHAVE_TOKEN)).toBe('jwt-token');
    expect(router.replace).not.toHaveBeenCalled();
  });
});
