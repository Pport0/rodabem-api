import * as SecureStore from 'expo-secure-store';

/**
 * Interceptores do cliente HTTP.
 *
 * Funcao chave: toda rota protegida do back exige `Authorization: Bearer` (RNE-02), e e este interceptor que o anexa.
 * Um erro aqui e silencioso — a requisicao sai sem credencial e volta 401, e a tela mostra "sessao expirada"
 * para quem acabou de entrar.
 */
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
    // Token ausente e token em branco sao o mesmo cenario: nao ha sessao.
    // Enviar `Bearer ` vazio faria o back responder 401 em vez de 'sem token'.
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

    // O scan envia multipart; perder esse cabecalho quebraria o upload.
    expect(config.headers['Content-Type']).toBe('multipart/form-data');
    expect(config.headers.Authorization).toBe('Bearer token-valido');
  });

  it('deve reler o token a cada requisicao', async () => {
    // Se o token fosse lido uma unica vez no carregamento do modulo, o logout
    // nao teria efeito: as requisicoes seguintes continuariam autenticadas.
    guardarToken('primeiro');
    await interceptorDeRequisicao()({ headers: {} });

    guardarToken('segundo');
    const config = await interceptorDeRequisicao()({ headers: {} });

    expect(config.headers.Authorization).toBe('Bearer segundo');
  });
});

describe('tratamento da resposta', () => {
  it('deve repassar o erro original, sem engoli-lo', async () => {
    // A tela decide a mensagem a partir do erro. Transformar aqui faria toda
    // falha virar a mesma mensagem generica.
    const original = Object.assign(new Error('Request failed'), {
      response: { status: 403 },
    });

    await expect(interceptorDeResposta().erro(original)).rejects.toBe(original);
  });

  it('nao deve quebrar diante de erro sem corpo nem mensagem', async () => {
    // Queda de rede chega assim. Se o interceptor estourar aqui, o aplicativo
    // fecha em vez de avisar.
    await expect(interceptorDeResposta().erro({})).rejects.toEqual({});
  });
});

describe('configuracao do cliente', () => {
  it('deve definir um tempo limite, para a requisicao nao ficar pendurada', async () => {
    // Sem limite, uma API fora do ar deixa a tela girando para sempre.
    expect((api as any).defaults.timeout).toBeGreaterThan(0);
  });
});
