import { BadRequestException } from '@nestjs/common';
import { OrsService } from './ors.service';

describe('OrsService', () => {
  let service: OrsService;
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

  const COORDENADA = {
    features: [{ geometry: { coordinates: [-49.2643, -16.6869] } }],
  };

  const ROTA = {
    routes: [{ summary: { distance: 1250500, duration: 79200 } }],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new OrsService(configService as never);
    fetchDublado = jest.spyOn(global, 'fetch');
  });

  afterEach(() => fetchDublado.mockRestore());

  describe('falha do servico de rotas', () => {
    it.each([
      ['chave revogada', 403, { error: 'Access to this API has been disallowed' }],
      ['cota estourada', 429, { error: 'Rate limit exceeded' }],
      ['servico fora do ar', 503, {}],
    ])('deve tratar %s como falha do servico, nao do endereco', async (_, status, corpo) => {
      fetchDublado.mockResolvedValue(responder(status, corpo));

      await expect(
        service.calcularRota('Goiania, GO', 'Belem, PA'),
      ).rejects.not.toThrow(/endere[cç]o n[aã]o encontrado/i);
    });

    it('nao deve vazar excecao crua quando a rede falha', async () => {
      fetchDublado.mockRejectedValue(new Error('getaddrinfo ENOTFOUND'));

      await expect(
        service.calcularRota('Goiania, GO', 'Belem, PA'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('resposta valida do servico', () => {
    it('deve recusar endereco que o servico nao encontra', async () => {
      fetchDublado.mockResolvedValue(responder(200, { features: [] }));

      await expect(
        service.calcularRota('Rua Que Nao Existe', 'Belem, PA'),
      ).rejects.toThrow(/endere[cç]o n[aã]o encontrado/i);
    });

    it('deve recusar quando nao ha rota entre os pontos', async () => {
      fetchDublado
        .mockResolvedValueOnce(responder(200, COORDENADA))
        .mockResolvedValueOnce(responder(200, COORDENADA))
        .mockResolvedValueOnce(responder(200, { routes: [] }));

      await expect(
        service.calcularRota('Goiania, GO', 'Belem, PA'),
      ).rejects.toThrow(/rota/i);
    });

    it('deve converter a distancia de metros para quilometros', async () => {
      fetchDublado
        .mockResolvedValueOnce(responder(200, COORDENADA))
        .mockResolvedValueOnce(responder(200, COORDENADA))
        .mockResolvedValueOnce(responder(200, ROTA));

      const rota = await service.calcularRota('Goiania, GO', 'Belem, PA');

      expect(rota.distanciaKm).toBe(1250.5);
    });

    it('deve converter a duracao de segundos para minutos', async () => {
      fetchDublado
        .mockResolvedValueOnce(responder(200, COORDENADA))
        .mockResolvedValueOnce(responder(200, COORDENADA))
        .mockResolvedValueOnce(responder(200, ROTA));

      const rota = await service.calcularRota('Goiania, GO', 'Belem, PA');

      expect(rota.duracaoMinutos).toBe(1320);
    });

    it('deve geocodificar cada parada intermediaria informada', async () => {
      fetchDublado.mockImplementation(async (url: unknown) =>
        String(url).includes('geocode')
          ? responder(200, COORDENADA)
          : responder(200, ROTA),
      );

      await service.calcularRota('Goiania, GO', 'Belem, PA', [
        'Palmas, TO',
        'Maraba, PA',
      ]);

      const enderecos = fetchDublado.mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.includes('geocode'));

      expect(enderecos).toHaveLength(4);
    });
  });

  describe('configuracao', () => {
    it('deve recusar a chamada quando nao ha chave configurada', async () => {
      const semChave = new OrsService({ get: () => undefined } as never);

      await expect(
        semChave.calcularRota('Goiania, GO', 'Belem, PA'),
      ).rejects.toThrow(/chave|configura/i);
    });
  });
});
