import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { TipoCombustivel } from '@prisma/client';
import { AbastecimentoService } from './abastecimento.service';

describe('AbastecimentoService', () => {
  let service: AbastecimentoService;

  const prisma = {
    caminhao: {
      findUnique: jest.fn(),
    },
    abastecimento: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const userId = 1;
  const dto = {
    precoPorLitro: 6,
    totalLitros: 100,
    quilometragem: 1000,
    tipoCombustivel: TipoCombustivel.DIESEL_S10,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AbastecimentoService(prisma as any);
  });

  it('deve impedir abastecimento sem caminhao cadastrado', async () => {
    prisma.caminhao.findUnique.mockResolvedValue(null);

    await expect(service.create(userId, dto as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve criar abastecimento valido', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });
    prisma.abastecimento.findFirst.mockResolvedValue(null);
    prisma.abastecimento.create.mockResolvedValue({ id: 1, valorTotal: 600 });

    const result = await service.create(userId, dto as any);

    expect(prisma.abastecimento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId,
        caminhaoId: 10,
        valorTotal: 600,
      }),
    });
    expect(result).toEqual({ id: 1, valorTotal: 600 });
  });

  it('deve calcular valor total automaticamente', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });
    prisma.abastecimento.findFirst.mockResolvedValue(null);
    prisma.abastecimento.create.mockResolvedValue({ id: 1, valorTotal: 600 });

    await service.create(userId, dto as any);

    expect(prisma.abastecimento.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        valorTotal: 600,
      }),
    });
  });

  it('deve impedir quilometragem menor que a ultima registrada', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });
    prisma.abastecimento.findFirst.mockResolvedValue({ quilometragem: 1200 });

    await expect(
      service.create(userId, { ...dto, quilometragem: 1100 } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve listar apenas abastecimentos do usuario', async () => {
    prisma.abastecimento.findMany.mockResolvedValue([]);

    await service.findAll(userId);

    expect(prisma.abastecimento.findMany).toHaveBeenCalledWith({
      where: { userId },
      orderBy: { dataAbastecimento: 'desc' },
      select: expect.any(Object),
    });
  });

  it('deve impedir acesso a abastecimento de outro usuario', async () => {
    prisma.abastecimento.findUnique.mockResolvedValue({ id: 1, userId: 2 });

    await expect(service.findOne(userId, 1)).rejects.toThrow(ForbiddenException);
  });

  it('deve recalcular valor total ao editar preco ou litros', async () => {
    prisma.abastecimento.findUnique.mockResolvedValue({
      id: 1,
      userId,
      caminhaoId: 10,
      precoPorLitro: 6,
      totalLitros: 100,
      quilometragem: 1000,
    });
    prisma.abastecimento.update.mockResolvedValue({ id: 1, valorTotal: 700 });

    const result = await service.update(userId, 1, {
      precoPorLitro: 7,
    } as any);

    expect(prisma.abastecimento.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({
        precoPorLitro: 7,
        valorTotal: 700,
      }),
    });
    expect(result).toEqual({ id: 1, valorTotal: 700 });
  });

  it('deve recalcular e validar quilometragem na edicao', async () => {
    prisma.abastecimento.findUnique.mockResolvedValue({
      id: 1,
      userId,
      caminhaoId: 10,
      precoPorLitro: 6,
      totalLitros: 100,
      quilometragem: 1500,
    });
    prisma.abastecimento.findFirst.mockResolvedValue({ quilometragem: 1600 });

    await expect(
      service.update(userId, 1, { quilometragem: 1400 } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve excluir abastecimento do proprio usuario', async () => {
    prisma.abastecimento.findUnique.mockResolvedValue({ id: 1, userId });
    prisma.abastecimento.delete.mockResolvedValue({ id: 1 });

    const result = await service.remove(userId, 1);

    expect(prisma.abastecimento.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(result.message).toContain('excluído com sucesso');
  });

  it('deve calcular media de consumo com dois ou mais abastecimentos', async () => {
    prisma.abastecimento.findMany.mockResolvedValue([
      { quilometragem: 1000, totalLitros: 80, dataAbastecimento: new Date() },
      { quilometragem: 1400, totalLitros: 50, dataAbastecimento: new Date() },
      { quilometragem: 1800, totalLitros: 40, dataAbastecimento: new Date() },
    ]);

    const result = await service.calcularMediaConsumo(userId);

    expect(result.mediaConsumo).toBe(9);
    expect(result.totalTrechosCalculados).toBe(2);
  });

  it('deve retornar mensagem apropriada quando nao houver abastecimentos suficientes', async () => {
    prisma.abastecimento.findMany.mockResolvedValue([
      { quilometragem: 1000, totalLitros: 80, dataAbastecimento: new Date() },
    ]);

    const result = await service.calcularMediaConsumo(userId);

    expect(result.mediaConsumo).toBeNull();
    expect(result.mensagem).toContain('pelo menos dois abastecimentos');
  });
});
