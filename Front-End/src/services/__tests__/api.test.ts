import * as SecureStore from 'expo-secure-store';

jest.mock('axios', () => {
  const handlersRequisicao: any[] = [];
  const handlersResposta: any[] = [];

  const instancia = {
    defaults: {} as Record<string, unknown>,
    interceptors: {
      request: {
        handlers: handlersRequisicao,
        use: (fulfilled: any, rejected?: any) =>
          handlersRequisicao.push({ fulfilled, rejected }),
      },
      response: {
        handlers: handlersResposta,
        use: (fulfilled: any, rejected?: any) =>
          handlersResposta.push({ fulfilled, rejected }),
      },
    },
  };

  return {
    __esModule: true,
    default: {
      create: jest.fn((config: Record<string, unknown>) => {
        instancia.defaults = { ...config };
        return instancia;
      }),
    },
  };
});

// eslint-disable-next-line import/first
import { api } from '../api';

const interceptorDeRequisicao = () =>
  (api.interceptors.request as any).handlers[0].fulfilled;

const interceptorDeResposta = () => {
  const handler = (api.interceptors.response as any).handlers[0];
  return { sucesso: handler.fulfilled, erro: handler.rejected };
};

describe('api - interceptor de requisicao', () => {
  it('deve injetar o token como Bearer quando existe token armazenado', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('jwt-token' as any);

    const config = await interceptorDeRequisicao()({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer jwt-token');
  });

  it('nao deve injetar Authorization quando nao ha token', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null as any);

    const config = await interceptorDeRequisicao()({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('nao deve injetar Authorization quando o token e string vazia', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('' as any);

    const config = await interceptorDeRequisicao()({ headers: {} });

    expect(config.headers.Authorization).toBeUndefined();
  });

  it('deve ler o token da chave configurada', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('jwt-token' as any);

    await interceptorDeRequisicao()({ headers: {} });

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith(
      process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token',
    );
  });

  it('deve preservar os headers ja presentes na requisicao', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('jwt-token' as any);

    const config = await interceptorDeRequisicao()({
      headers: { 'Content-Type': 'application/json' },
    });

    expect(config.headers['Content-Type']).toBe('application/json');
    expect(config.headers.Authorization).toBe('Bearer jwt-token');
  });

  it('deve devolver a mesma configuracao recebida, e nao uma copia', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue(null as any);
    const original = { headers: {} };

    const config = await interceptorDeRequisicao()(original);

    expect(config).toBe(original);
  });

  it('deve consultar o armazenamento seguro a cada requisicao', async () => {
    jest.mocked(SecureStore.getItemAsync).mockResolvedValue('jwt-token' as any);

    await interceptorDeRequisicao()({ headers: {} });
    await interceptorDeRequisicao()({ headers: {} });

    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(2);
  });
});

describe('api - interceptor de resposta', () => {
  it('deve repassar a resposta de sucesso sem alteracao', () => {
    const { sucesso } = interceptorDeResposta();
    const resposta = { status: 200, data: { id: 1 } };

    expect(sucesso(resposta)).toBe(resposta);
  });

  it('deve rejeitar mantendo o erro original', async () => {
    const { erro } = interceptorDeResposta();
    const original = { message: 'Network Error', config: { url: '/auth/login' } };

    await expect(erro(original)).rejects.toBe(original);
  });

  it('deve registrar o erro no console em ambiente de desenvolvimento', async () => {
    const { erro } = interceptorDeResposta();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      erro({ message: 'Network Error', config: { url: '/auth/login' } }),
    ).rejects.toBeDefined();

    expect(spy).toHaveBeenCalledWith('[API Error]', '/auth/login', 'Network Error');
    spy.mockRestore();
  });

  it('nao deve registrar no console fora do ambiente de desenvolvimento', async () => {
    const { erro } = interceptorDeResposta();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const devOriginal = (global as any).__DEV__;
    (global as any).__DEV__ = false;

    try {
      await expect(
        erro({ message: 'Network Error', config: { url: '/auth/login' } }),
      ).rejects.toBeDefined();

      expect(spy).not.toHaveBeenCalled();
    } finally {
      (global as any).__DEV__ = devOriginal;
      spy.mockRestore();
    }
  });

  it('nao deve quebrar quando o erro nao possui config nem message', async () => {
    const { erro } = interceptorDeResposta();
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(erro({})).rejects.toEqual({});

    expect(spy).toHaveBeenCalledWith('[API Error]', undefined, undefined);
    spy.mockRestore();
  });
});

describe('api - configuracao da instancia', () => {
  it('deve definir timeout para nao deixar a requisicao pendurada', () => {
    expect((api as any).defaults.timeout).toBe(60000);
  });

  it('deve registrar exatamente um interceptor de requisicao e um de resposta', () => {
    expect((api.interceptors.request as any).handlers).toHaveLength(1);
    expect((api.interceptors.response as any).handlers).toHaveLength(1);
  });
});
