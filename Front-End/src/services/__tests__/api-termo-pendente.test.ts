import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';

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
import { api, liberarRedirecionamentoTermo } from '../api';

const CHAVE_TOKEN = process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token';
const memoria: Map<string, string> = (SecureStore as any).__memoria;

const tratarErro = (erro: unknown) =>
  (api.interceptors.response as any).handlers[0].rejected(erro);

const erroHttp = (status: number, url: string, data: unknown = {}) =>
  Object.assign(new Error(`Request failed with status code ${status}`), {
    config: { url },
    response: { status, data },
  });

const termoPendente = (url = '/abastecimentos') =>
  erroHttp(403, url, { code: 'TERMO_PENDENTE', message: 'Aceite o termo vigente.' });

let consoleError: jest.SpyInstance;

beforeEach(() => {
  consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
  memoria.set(CHAVE_TOKEN, 'jwt-token');
  liberarRedirecionamentoTermo();
});

afterEach(() => consoleError.mockRestore());

describe('403 com termo pendente', () => {
  it('deve levar o usuario para o aceite do termo', async () => {
    await expect(tratarErro(termoPendente())).rejects.toBeDefined();

    expect(router.replace).toHaveBeenCalledWith('/termo-pendente');
  });

  it('deve redirecionar uma vez so quando varias requisicoes falham juntas', async () => {
    await Promise.allSettled([
      tratarErro(termoPendente('/abastecimentos')),
      tratarErro(termoPendente('/documentos')),
      tratarErro(termoPendente('/frete/historico')),
    ]);

    expect(jest.mocked(router.replace).mock.calls.filter(([destino]) => destino === '/termo-pendente')).toHaveLength(1);
  });

  it('deve voltar a redirecionar depois que o aceite libera a navegacao', async () => {
    await expect(tratarErro(termoPendente())).rejects.toBeDefined();
    liberarRedirecionamentoTermo();

    await expect(tratarErro(termoPendente())).rejects.toBeDefined();

    expect(jest.mocked(router.replace).mock.calls.filter(([destino]) => destino === '/termo-pendente')).toHaveLength(2);
  });

  it('deve repassar o erro, para a tela que pediu poder tratar', async () => {
    const erro = termoPendente();

    await expect(tratarErro(erro)).rejects.toBe(erro);
  });
});

describe('403 por outro motivo', () => {
  it('nao deve levar ao aceite quando o 403 nao traz o codigo de termo pendente', async () => {
    await expect(
      tratarErro(erroHttp(403, '/abastecimentos/9', { message: 'Sem permissao.' })),
    ).rejects.toBeDefined();

    expect(router.replace).not.toHaveBeenCalledWith('/termo-pendente');
  });

  it('nao deve levar ao aceite quando outro status traz o mesmo codigo', async () => {
    await expect(
      tratarErro(erroHttp(400, '/termos/aceite', { code: 'TERMO_PENDENTE' })),
    ).rejects.toBeDefined();

    expect(router.replace).not.toHaveBeenCalledWith('/termo-pendente');
  });
});
