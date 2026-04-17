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
});
