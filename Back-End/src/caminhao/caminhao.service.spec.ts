import { BadRequestException } from '@nestjs/common';
import { CaminhaoService } from './caminhao.service';

describe('CaminhaoService', () => {
  let service: CaminhaoService;

  const prisma = {
    caminhao: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    documento: {
      count: jest.fn(),
    },
    abastecimento: {
      count: jest.fn(),
    },
    simulacaoFrete: {
      count: jest.fn(),
    },
  };

  const userId = 1;
  const createDto = {
    placa: 'ABC1D23',
    modelo: 'FH 540',
    renavam: '12345678901',
    numeroEixos: 6,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new CaminhaoService(prisma as any);
  });

  it('deve cadastrar caminhao quando o usuario ainda nao possui um', async () => {
    prisma.caminhao.findUnique.mockResolvedValue(null);
    prisma.caminhao.create.mockResolvedValue({ id: 10, userId, ...createDto });

    const result = await service.create(userId, createDto as any);

    expect(prisma.caminhao.create).toHaveBeenCalledWith({
      data: { ...createDto, userId },
    });
    expect(result.message).toContain('cadastrado com sucesso');
  });

  it('deve impedir cadastro de segundo caminhao para o mesmo usuario', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, ...createDto });

    await expect(service.create(userId, createDto as any)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve retornar apenas o caminhao do usuario autenticado', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, ...createDto });

    const result = await service.meuCaminhao(userId);

    expect(prisma.caminhao.findUnique).toHaveBeenCalledWith({
      where: { userId },
    });
    expect(result).toMatchObject({ userId, placa: createDto.placa });
  });

  it('deve permitir editar o proprio caminhao', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, ...createDto });
    prisma.caminhao.update.mockResolvedValue({
      id: 10,
      userId,
      ...createDto,
      modelo: 'FH 460',
    });

    const result = await service.update(userId, { modelo: 'FH 460' } as any);

    expect(prisma.caminhao.update).toHaveBeenCalledWith({
      where: { userId },
      data: { modelo: 'FH 460' },
    });
    expect(result.message).toContain('alteradas com sucesso');
  });

  it('deve impedir editar caminhao inexistente para o usuario', async () => {
    prisma.caminhao.findUnique.mockResolvedValue(null);

    await expect(
      service.update(userId, { modelo: 'FH 460' } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve excluir caminhao sem vinculos', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, ...createDto });
    prisma.documento.count.mockResolvedValue(0);
    prisma.abastecimento.count.mockResolvedValue(0);
    prisma.simulacaoFrete.count.mockResolvedValue(0);
    prisma.caminhao.delete.mockResolvedValue({ id: 10 });

    const result = await service.delete(userId);

    expect(prisma.caminhao.delete).toHaveBeenCalledWith({ where: { userId } });
    expect(result.message).toContain('removido com sucesso');
  });

 
  it('deve bloquear exclusao quando houver documentos vinculados', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, ...createDto });
    prisma.documento.count.mockResolvedValue(2);

    await expect(service.delete(userId)).rejects.toThrow(BadRequestException);
  });

  it('deve bloquear exclusao quando houver abastecimentos vinculados', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, ...createDto });
    prisma.documento.count.mockResolvedValue(0);
    prisma.abastecimento.count.mockResolvedValue(3);

    await expect(service.delete(userId)).rejects.toThrow(BadRequestException);
  });

  it('deve bloquear exclusao quando houver simulacoes de frete vinculadas', async () => {
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId, ...createDto });
    prisma.documento.count.mockResolvedValue(0);
    prisma.abastecimento.count.mockResolvedValue(0);
    prisma.simulacaoFrete.count.mockResolvedValue(1);

    await expect(service.delete(userId)).rejects.toThrow(BadRequestException);
  });

  it('deve impedir exclusao de caminhao inexistente', async () => {
    prisma.caminhao.findUnique.mockResolvedValue(null);

    await expect(service.delete(userId)).rejects.toThrow(BadRequestException);
  });
});