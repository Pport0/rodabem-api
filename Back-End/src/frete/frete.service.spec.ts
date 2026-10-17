import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TipoCarga } from '@prisma/client';
import { FreteService } from './frete.service';

describe('FreteService', () => {
  let service: FreteService;

  const prisma = {
    caminhao: {
      findUnique: jest.fn(),
    },
    tabelaAntt: {
      findFirst: jest.fn(),
    },
    simulacaoFrete: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  const ors = {
    calcularRota: jest.fn(),
  };

  const abastecimentoService = {
    calcularMediaConsumo: jest.fn(),
  };

  const userId = 1;
  const dto = {
    origem: 'Goiania, GO',
    destino: 'Brasilia, DF',
    tipoCarga: TipoCarga.GERAL,
    precoCombustivel: 6,
    pedagiosManual: 50,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FreteService(
      prisma as any,
      ors as any,
      abastecimentoService as any,
    );
  });

  it('deve impedir calculo de frete quando o usuario nao possui caminhao', async () => {
    prisma.caminhao.findUnique.mockResolvedValue(null);

    await expect(service.simular(userId, dto as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve impedir simulacao quando o caminhao nao possui numero de eixos', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, numeroEixos: null });

    await expect(service.simular(userId, dto as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve calcular frete com dados validos usando consumo manual', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, numeroEixos: 6 });
    ors.calcularRota.mockResolvedValue({
      distanciaKm: 200,
      duracaoMinutos: 180,
      descricaoRota: 'Goiania -> Brasilia',
    });
    prisma.tabelaAntt.findFirst.mockResolvedValue({ valorPorKm: 5 });
    prisma.simulacaoFrete.create.mockResolvedValue({ id: 99 });

    const result = await service.simular(userId, {
      ...dto,
      consumoMedioKmLOverride: 2,
    } as any);

    expect(result.simulacaoId).toBe(99);
    expect(result.consumoMedioKmL).toBe(2);
    expect(prisma.simulacaoFrete.create).toHaveBeenCalled();
  });

  it('deve usar consumo historico quando nao houver valor manual', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, numeroEixos: 6 });
    ors.calcularRota.mockResolvedValue({
      distanciaKm: 100,
      duracaoMinutos: 90,
      descricaoRota: 'A -> B',
    });
    abastecimentoService.calcularMediaConsumo.mockResolvedValue({
      mediaConsumo: 3.5,
    });
    prisma.tabelaAntt.findFirst.mockResolvedValue({ valorPorKm: 5 });
    prisma.simulacaoFrete.create.mockResolvedValue({ id: 100 });

    const result = await service.simular(userId, dto as any);

    expect(abastecimentoService.calcularMediaConsumo).toHaveBeenCalledWith(userId);
    expect(result.consumoMedioKmL).toBe(3.5);
  });

  it('deve falhar quando nao houver historico suficiente e nenhum consumo manual', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, numeroEixos: 6 });
    ors.calcularRota.mockResolvedValue({
      distanciaKm: 100,
      duracaoMinutos: 90,
      descricaoRota: 'A -> B',
    });
    abastecimentoService.calcularMediaConsumo.mockResolvedValue({
      mediaConsumo: null,
    });

    await expect(service.simular(userId, dto as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve falhar quando nao encontrar tabela ANTT compativel', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, numeroEixos: 6 });
    ors.calcularRota.mockResolvedValue({
      distanciaKm: 100,
      duracaoMinutos: 90,
      descricaoRota: 'A -> B',
    });
    prisma.tabelaAntt.findFirst.mockResolvedValue(null);

    await expect(
      service.simular(userId, { ...dto, consumoMedioKmLOverride: 2 } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('deve persistir historico da simulacao', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, numeroEixos: 6 });
    ors.calcularRota.mockResolvedValue({
      distanciaKm: 200,
      duracaoMinutos: 180,
      descricaoRota: 'A -> B',
    });
    prisma.tabelaAntt.findFirst.mockResolvedValue({ valorPorKm: 5 });
    prisma.simulacaoFrete.create.mockResolvedValue({ id: 77 });

    await service.simular(userId, {
      ...dto,
      consumoMedioKmLOverride: 2,
    } as any);

    expect(prisma.simulacaoFrete.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        caminhaoId: 10,
        origem: dto.origem,
        destino: dto.destino,
      }),
    });
  });

  it('deve listar historico apenas do proprio usuario', async () => {
    prisma.simulacaoFrete.findMany.mockResolvedValue([]);

    await service.historico(userId);

    expect(prisma.simulacaoFrete.findMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('deve impedir acesso a simulacao de outro usuario', async () => {
    prisma.simulacaoFrete.findUnique.mockResolvedValue({ id: 1, userId: 2 });

    await expect(service.findOne(userId, 1)).rejects.toThrow(NotFoundException);
  });

  describe('piso minimo da ANTT', () => {
    const CCD = 5.1771;
    const CC = 220.31;

    const simularCom = async (
      { distanciaKm = 500, valorPorKm = CCD, custoCargaDescarga = CC, ...resto }:
        Record<string, any> = {},
    ) => {
      prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, numeroEixos: 6 });
      ors.calcularRota.mockResolvedValue({
        distanciaKm,
        duracaoMinutos: 90,
        descricaoRota: 'A -> B',
      });
      prisma.tabelaAntt.findFirst.mockResolvedValue({ valorPorKm, custoCargaDescarga });
      prisma.simulacaoFrete.create.mockResolvedValue({ id: 1 });

      return service.simular(userId, {
        ...dto,
        consumoMedioKmLOverride: 10,
        ...resto,
      } as any);
    };

    it('deve somar o custo de carga e descarga ao custo de deslocamento', async () => {
      const result = await simularCom();

      expect(result.valorMinimoAntt).toBe(2808.86);
    });

    it('deve acrescentar o retorno vazio ao valor de ida', async () => {
      const result = await simularCom({ retornoVazio: true });

      expect(result.valorMinimoAntt).toBe(5190.33);
    });

    it('deve cobrar o retorno vazio a 0,92 do custo de deslocamento', async () => {
      const ida = await simularCom();
      const comRetorno = await simularCom({ retornoVazio: true });

      const acrescimo = parseFloat(
        (comRetorno.valorMinimoAntt - ida.valorMinimoAntt).toFixed(2),
      );

      expect(acrescimo).toBe(2381.47);
    });

    it('nao deve cobrar carga e descarga duas vezes no retorno vazio', async () => {
      const ida = await simularCom();
      const comRetorno = await simularCom({ retornoVazio: true });

      const acrescimo = comRetorno.valorMinimoAntt - ida.valorMinimoAntt;

      expect(acrescimo).toBeLessThan(0.92 * 500 * CCD + CC);
    });

    it('deve consultar a faixa da tabela pela distancia carregada', async () => {
      await simularCom({ distanciaKm: 500, retornoVazio: true });

      const { where } = prisma.tabelaAntt.findFirst.mock.calls[0][0];
      expect(where.distanciaMin.lte).toBe(500);
      expect(where.distanciaMax.gte).toBe(500);
    });

    it('deve consultar a tabela pelos eixos e pelo tipo de carga do caminhao', async () => {
      await simularCom();

      const { where } = prisma.tabelaAntt.findFirst.mock.calls[0][0];
      expect(where.numeroEixos).toBe(6);
      expect(where.tipoCarga).toBe(TipoCarga.GERAL);
    });

    it('nao deve ignorar o alto desempenho no calculo do piso', async () => {
      const comum = await simularCom();
      const altoDesempenho = await simularCom({ altoDesempenho: true });

      expect(altoDesempenho.valorMinimoAntt).not.toBe(comum.valorMinimoAntt);
    });

    it('nao deve ignorar a composicao veicular no calculo do piso', async () => {
      const simples = await simularCom({ composicaoVeicular: false });
      const composicao = await simularCom({ composicaoVeicular: true });

      expect(composicao.valorMinimoAntt).not.toBe(simples.valorMinimoAntt);
    });

    it('deve recusar a simulacao quando nao ha faixa da ANTT para o caminhao', async () => {
      prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, numeroEixos: 9 });
      ors.calcularRota.mockResolvedValue({ distanciaKm: 100, duracaoMinutos: 90 });
      prisma.tabelaAntt.findFirst.mockResolvedValue(null);

      await expect(
        service.simular(userId, { ...dto, consumoMedioKmLOverride: 10 } as any),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('custo de combustivel', () => {
    const simularCom = async (resto: Record<string, any> = {}) => {
      prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, numeroEixos: 6 });
      ors.calcularRota.mockResolvedValue({ distanciaKm: 100, duracaoMinutos: 90 });
      prisma.tabelaAntt.findFirst.mockResolvedValue({ valorPorKm: 5 });
      prisma.simulacaoFrete.create.mockResolvedValue({ id: 1 });
      return service.simular(userId, { ...dto, ...resto } as any);
    };

    it('deve calcular os litros pela distancia e pelo consumo medio', async () => {
      const result = await simularCom({ consumoMedioKmLOverride: 10 });

      expect(result.litrosNecessarios).toBe(10);
    });

    it('deve contar ida e volta nos litros quando ha retorno vazio', async () => {
      const result = await simularCom({
        consumoMedioKmLOverride: 10,
        retornoVazio: true,
      });

      expect(result.litrosNecessarios).toBe(20);
    });

    it('deve multiplicar os litros pelo preco do combustivel', async () => {
      const result = await simularCom({
        consumoMedioKmLOverride: 10,
        precoCombustivel: 6,
      });

      expect(result.custoCombustivel).toBe(60);
    });

    it('deve arredondar litros e custo em duas casas decimais', async () => {
      const result = await simularCom({
        consumoMedioKmLOverride: 3,
        precoCombustivel: 6.39,
      });

      expect(result.litrosNecessarios).toBe(33.33);
      expect(result.custoCombustivel).toBe(212.98);
    });

    it('o consumo informado deve ter precedencia sobre o historico', async () => {
      abastecimentoService.calcularMediaConsumo.mockResolvedValue({ mediaConsumo: 2 });

      const result = await simularCom({ consumoMedioKmLOverride: 10 });

      expect(result.consumoMedioKmL).toBe(10);
      expect(abastecimentoService.calcularMediaConsumo).not.toHaveBeenCalled();
    });
  });

  describe('resultado da simulacao', () => {
    const simularCom = async (resto: Record<string, any> = {}, valorPorKm = 5) => {
      prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, numeroEixos: 6 });
      ors.calcularRota.mockResolvedValue({ distanciaKm: 100, duracaoMinutos: 90 });
      prisma.tabelaAntt.findFirst.mockResolvedValue({ valorPorKm });
      prisma.simulacaoFrete.create.mockResolvedValue({ id: 1 });
      return service.simular(userId, {
        ...dto,
        consumoMedioKmLOverride: 10,
        ...resto,
      } as any);
    };

    it('deve subtrair o custo de combustivel do piso da ANTT', async () => {
      const result = await simularCom({ precoCombustivel: 6, pedagiosManual: 50 });

      expect(result.valorLiquidoEstimado).toBe(440);
    });

    it('o pedagio informado nao deve alterar o resultado liquido', async () => {
      const semPedagio = await simularCom({ precoCombustivel: 6, pedagiosManual: 0 });
      const comPedagio = await simularCom({ precoCombustivel: 6, pedagiosManual: 300 });

      expect(comPedagio.valorLiquidoEstimado).toBe(semPedagio.valorLiquidoEstimado);
    });

    it('deve avisar quando o piso da ANTT nao cobre os custos da viagem', async () => {
      const result = await simularCom(
        { precoCombustivel: 100, pedagiosManual: 0 },
        1,
      );

      expect(result.valorLiquidoEstimado).toBeLessThan(0);
      expect(result.aviso).toMatch(/nao cobre|não cobre/);
    });

    it('nao deve avisar quando o piso cobre os custos da viagem', async () => {
      const result = await simularCom({ precoCombustivel: 6, pedagiosManual: 0 });

      expect(result.aviso).toBeNull();
    });

    it('deve sinalizar quando o piso nao cobre os custos da viagem', async () => {
      const result = await simularCom(
        { precoCombustivel: 100, pedagiosManual: 0 },
        1,
      );

      expect(result.abaixoMinimoAntt).toBe(true);
    });

    it('nao deve sinalizar quando o piso cobre os custos da viagem', async () => {
      const result = await simularCom({ precoCombustivel: 6, pedagiosManual: 0 });

      expect(result.abaixoMinimoAntt).toBe(false);
    });

    it('deve repassar as paradas intermediarias ao calculo de rota', async () => {
      await simularCom({ paradasIntermediarias: ['Anapolis, GO'] });

      expect(ors.calcularRota).toHaveBeenCalledWith(
        dto.origem,
        dto.destino,
        ['Anapolis, GO'],
      );
    });

    it('deve devolver a duracao estimada da rota', async () => {
      const result = await simularCom();

      expect(result.duracaoMinutos).toBe(90);
    });
  });

});
