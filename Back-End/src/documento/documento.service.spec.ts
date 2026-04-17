import {
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DocumentoService } from './documento.service';

describe('DocumentoService', () => {
  let service: DocumentoService;

  const prisma = {
    documento: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const userId = 1;
  const now = new Date();

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DocumentoService(prisma as any);
  });

  it('deve cadastrar documento com dados validos', async () => {
    prisma.documento.create.mockResolvedValue({ id: 1, userId });

    const result = await service.create(userId, {
      nome: 'CRLV',
      numero: 'DOC-001',
      dataEmissao: '2026-01-01',
      dataVencimento: '2026-12-31',
      caminhaoId: 10,
    });

    expect(prisma.documento.create).toHaveBeenCalled();
    expect(result.message).toBe('Documento cadastrado com sucesso');
  });

  it('deve impedir cadastro com data de vencimento anterior a emissao', async () => {
    await expect(
      service.create(userId, {
        nome: 'CRLV',
        numero: 'DOC-001',
        dataEmissao: '2026-12-31',
        dataVencimento: '2026-01-01',
        caminhaoId: 10,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve calcular status como valido, vencendo e expirado', async () => {
    prisma.documento.findMany.mockResolvedValue([
      {
        id: 1,
        userId,
        dataVencimento: new Date(now.getTime() + 45 * 24 * 60 * 60 * 1000),
      },
      {
        id: 2,
        userId,
        dataVencimento: new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000),
      },
      {
        id: 3,
        userId,
        dataVencimento: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
    ]);

    const result = await service.findAll(userId);

    expect(result[0].status).toBe('VÁLIDO');
    expect(result[1].status).toBe('VENCENDO');
    expect(result[2].status).toBe('EXPIRADO');
  });

  it('deve listar apenas documentos do proprio usuario', async () => {
    prisma.documento.findMany.mockResolvedValue([]);

    await service.findAll(userId);

    expect(prisma.documento.findMany).toHaveBeenCalledWith({
      where: { userId },
    });
  });

  it('deve impedir consulta indireta de documento de outro usuario na edicao', async () => {
    prisma.documento.findUnique.mockResolvedValue({ id: 9, userId: 2 });

    await expect(
      service.update(userId, 9, { observacao: 'Atualizado' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('deve permitir edicao do proprio documento', async () => {
    prisma.documento.findUnique.mockResolvedValue({ id: 9, userId });
    prisma.documento.update.mockResolvedValue({ id: 9, observacao: 'Atualizado' });

    const result = await service.update(userId, 9, {
      observacao: 'Atualizado',
    });

    expect(prisma.documento.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: {
        observacao: 'Atualizado',
        dataEmissao: undefined,
        dataVencimento: undefined,
      },
    });
    expect(result).toEqual({ id: 9, observacao: 'Atualizado' });
  });

  it('deve impedir exclusao de documento inexistente', async () => {
    prisma.documento.findUnique.mockResolvedValue(null);

    await expect(service.remove(userId, 123)).rejects.toThrow(
      BadRequestException,
    );
  });

  it('deve remover documento corretamente', async () => {
    prisma.documento.findUnique.mockResolvedValue({ id: 5, userId });
    prisma.documento.delete.mockResolvedValue({ id: 5 });

    const result = await service.remove(userId, 5);

    expect(prisma.documento.delete).toHaveBeenCalledWith({
      where: { id: 5 },
    });
    expect(result).toEqual({ message: 'Documento removido com sucesso' });
  });
});
