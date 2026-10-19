import {
  MENSAGEM_FALHA,
  MENSAGEM_SEM_POSTOS,
  PostosProximosService,
} from './postos-proximos.service';

describe('PostosProximosService', () => {
  let service: PostosProximosService;
  let fetchDublado: jest.SpyInstance;

  const configService = {
    get: jest.fn(() => 'chave-de-teste'),
  };

  const responder = (status: number, corpo: unknown) =>
    ({
      ok: status >= 200 && status < 300,
      status,
      json: async () => corpo,
    }) as Response;

  const poi = (distance: number, tags: Record<string, string>) => ({
    properties: { distance, osm_tags: tags },
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PostosProximosService(configService as never);
    fetchDublado = jest.spyOn(global, 'fetch');
    jest.spyOn((service as any).logger, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    fetchDublado.mockRestore();
  });

  describe('consulta ao ORS', () => {
    it('deve consultar postos (categoria 596) num raio de 500 m, em longitude e latitude', async () => {
      fetchDublado.mockResolvedValue(responder(200, { features: [] }));

      await service.buscar(-16.3281, -48.9526);

      const [url, opcoes] = fetchDublado.mock.calls[0];
      expect(url).toBe('https://api.openrouteservice.org/pois');
      expect(opcoes.method).toBe('POST');
      expect(JSON.parse(opcoes.body)).toEqual({
        request: 'pois',
        geometry: {
          geojson: { type: 'Point', coordinates: [-48.9526, -16.3281] },
          buffer: 500,
        },
        filters: { category_ids: [596] },
        limit: 5,
        sortby: 'distance',
      });
    });

    it('deve enviar a chave no header, e nunca na URL', async () => {
      fetchDublado.mockResolvedValue(responder(200, { features: [] }));

      await service.buscar(-16.3281, -48.9526);

      const [url, opcoes] = fetchDublado.mock.calls[0];
      expect(opcoes.headers.Authorization).toBe('chave-de-teste');
      expect(url).not.toContain('chave-de-teste');
    });

    it('deve limitar o tempo de espera pelo ORS', async () => {
      fetchDublado.mockResolvedValue(responder(200, { features: [] }));

      await service.buscar(-16.3281, -48.9526);

      expect(fetchDublado.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
    });
  });

  describe('sucesso', () => {
    it('deve devolver nome e distancia em metros, do mais perto ao mais longe', async () => {
      fetchDublado.mockResolvedValue(
        responder(200, {
          features: [
            poi(857.12, { name: 'Petrobrás' }),
            poi(652.08, { name: 'Carrefour Posto Anápolis' }),
          ],
        }),
      );

      await expect(service.buscar(-16.3281, -48.9526)).resolves.toEqual({
        postos: [
          { nome: 'Carrefour Posto Anápolis', distanciaMetros: 652 },
          { nome: 'Petrobrás', distanciaMetros: 857 },
        ],
        mensagem: null,
      });
    });

    it('deve usar a marca quando o posto nao tem nome, e ignorar posto sem nenhum dos dois', async () => {
      fetchDublado.mockResolvedValue(
        responder(200, {
          features: [
            poi(120, { brand: 'Shell' }),
            poi(200, { amenity: 'fuel' }),
          ],
        }),
      );

      const resultado = await service.buscar(-16.3281, -48.9526);

      expect(resultado.postos).toEqual([
        { nome: 'Shell', distanciaMetros: 120 },
      ]);
    });

    it('deve devolver no maximo 5 postos', async () => {
      const features = Array.from({ length: 7 }, (_, i) =>
        poi(100 + i, { name: `Posto ${i}` }),
      );
      fetchDublado.mockResolvedValue(responder(200, { features }));

      const resultado = await service.buscar(-16.3281, -48.9526);

      expect(resultado.postos).toHaveLength(5);
      expect(resultado.postos[0].nome).toBe('Posto 0');
    });
  });

  describe('sem resultados', () => {
    it('deve devolver lista vazia e mensagem quando nao ha postos no raio', async () => {
      fetchDublado.mockResolvedValue(
        responder(200, { type: 'FeatureCollection', features: [] }),
      );

      await expect(service.buscar(-16.3281, -48.9526)).resolves.toEqual({
        postos: [],
        mensagem: MENSAGEM_SEM_POSTOS,
      });
    });

    it('deve tratar resposta sem a lista de features como sem resultados', async () => {
      fetchDublado.mockResolvedValue(responder(200, {}));

      await expect(service.buscar(-16.3281, -48.9526)).resolves.toEqual({
        postos: [],
        mensagem: MENSAGEM_SEM_POSTOS,
      });
    });
  });

  describe('falha do ORS', () => {
    it.each([
      ['cota excedida', 429, { error: 'Rate limit exceeded' }],
      [
        'chave recusada',
        403,
        { error: 'Access to this API has been disallowed' },
      ],
      ['servico fora do ar', 503, {}],
    ])(
      'deve devolver lista vazia, sem lancar erro, quando o ORS responde %s',
      async (_, status, corpo) => {
        fetchDublado.mockResolvedValue(responder(status, corpo));

        await expect(service.buscar(-16.3281, -48.9526)).resolves.toEqual({
          postos: [],
          mensagem: MENSAGEM_FALHA,
        });
      },
    );

    it('deve devolver lista vazia quando a rede falha ou o tempo esgota', async () => {
      fetchDublado.mockRejectedValue(
        new Error('The operation was aborted due to timeout'),
      );

      await expect(service.buscar(-16.3281, -48.9526)).resolves.toEqual({
        postos: [],
        mensagem: MENSAGEM_FALHA,
      });
    });

    it('nao deve registrar a chave no log de erro', async () => {
      const log = jest.spyOn((service as any).logger, 'error');
      fetchDublado.mockResolvedValue(
        responder(403, { error: 'Access disallowed' }),
      );

      await service.buscar(-16.3281, -48.9526);

      expect(log).toHaveBeenCalled();
      expect(JSON.stringify(log.mock.calls)).not.toContain('chave-de-teste');
    });
  });
});
