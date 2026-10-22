import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

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

const CHAVE_TOKEN = process.env.EXPO_PUBLIC_TOKEN_KEY || 'rodabem_token';
const CHAVE_USUARIO = process.env.EXPO_PUBLIC_USER_KEY || 'rodabem_user';

const guardarToken = (valor: string | null) =>
  jest.mocked(SecureStore.getItemAsync).mockResolvedValue(valor as any);

beforeEach(() => jest.clearAllMocks());

describe('credencial anexada a requisicao', () => {
  it('deve anexar o token guardado como Bearer', async () => {
    guardarToken('token-valido');

    const config = await interceptorDeRequisicao()({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer token-valido');
  });

  it('nao deve anexar credencial quando nao ha token guardado', async () => {
    for (const vazio of [null, '']) {
      guardarToken(vazio);
      const config = await interceptorDeRequisicao()({ headers: {} });
      expect(config.headers.Authorization).toBeUndefined();
    }
  });

  it('deve preservar os cabecalhos que a chamada ja trazia', async () => {
    guardarToken('token-valido');

    const config = await interceptorDeRequisicao()({
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(config.headers.Authorization).toBe('Bearer token-valido');
  });

  it('deve reler o token a cada requisicao', async () => {
    guardarToken('primeiro');
    await interceptorDeRequisicao()({ headers: {} });

    guardarToken('segundo');
    const config = await interceptorDeRequisicao()({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer segundo');
  });
});

describe('tratamento da resposta', () => {
  it('deve entregar a resposta bem-sucedida sem alterar nada', async () => {
    const resposta = { status: 200, data: { id: 1, nome: 'Gabriel' } };

    await expect(interceptorDeResposta().sucesso(resposta)).toBe(resposta);
  });

  it('nao deve escrever no console fora do modo de desenvolvimento', async () => {
    const console_error = jest.spyOn(console, 'error').mockImplementation(() => {});
    const dev = (global as any).__DEV__;
    (global as any).__DEV__ = false;

    try {
      await expect(
        interceptorDeResposta().erro({ config: { url: '/users' }, message: 'falhou' }),
      ).rejects.toBeTruthy();

      expect(console_error).not.toHaveBeenCalled();
    } finally {
      (global as any).__DEV__ = dev;
      console_error.mockRestore();
    }
  });

  it('deve repassar o erro original, sem engoli-lo', async () => {
    const original = Object.assign(new Error('Request failed'), {
      response: { status: 403 },
    });

    await expect(interceptorDeResposta().erro(original)).rejects.toBe(original);
  });

  it('nao deve quebrar diante de erro sem corpo nem mensagem', async () => {
    await expect(interceptorDeResposta().erro({})).rejects.toEqual({});
  });
});

describe('sessao recusada pelo servidor', () => {
  const recusar = (url = '/users/me') =>
    interceptorDeResposta()
      .erro(
        Object.assign(new Error('Request failed with status code 401'), {
          config: { url },
          response: { status: 401 },
        }),
      )
      .catch(() => undefined);

  const entrarDeNovo = () =>
    interceptorDeResposta().sucesso({
      status: 200,
      config: { url: '/auth/login' },
      data: { access_token: 'token-novo' },
    });

  beforeEach(() => {
    entrarDeNovo();
    jest.clearAllMocks();
  });

  it('deve apagar a credencial guardada quando a API responde 401', async () => {
    await recusar();

    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(CHAVE_TOKEN);
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith(CHAVE_USUARIO);
  });

  it('deve levar o usuario para autenticar de novo quando a API responde 401', async () => {
    await recusar();

    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('deve encerrar a sessao uma unica vez quando varias respostas 401 chegam juntas', async () => {
    await Promise.all([recusar(), recusar('/caminhao'), recusar('/documentos')]);

    expect(jest.mocked(router.replace).mock.calls).toHaveLength(1);
  });

  it('deve voltar a encerrar a sessao depois de o usuario entrar de novo', async () => {
    await recusar();
    jest.clearAllMocks();

    entrarDeNovo();
    await recusar();

    expect(router.replace).toHaveBeenCalledWith('/');
  });

  it('nao deve avisar que a sessao expirou quando nao havia credencial guardada', async () => {
    guardarToken(null);

    await recusar('/documentos/alertas');

    expect(router.replace).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
  });

  it('nao deve encerrar a sessao quando o 401 vem da propria autenticacao', async () => {
    await recusar('/auth/login');

    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });

  it('nao deve encerrar a sessao em erro que nao e de autenticacao', async () => {
    for (const status of [400, 403, 404, 500]) {
      await interceptorDeResposta()
        .erro(
          Object.assign(new Error('falhou'), {
            config: { url: '/users/me' },
            response: { status },
          }),
        )
        .catch(() => undefined);
    }

    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(router.replace).not.toHaveBeenCalled();
  });
});

describe('configuracao do cliente', () => {
  it('deve definir um tempo limite, para a requisicao nao ficar pendurada', async () => {
    expect((api as any).defaults.timeout).toBeGreaterThan(0);
  });
});
