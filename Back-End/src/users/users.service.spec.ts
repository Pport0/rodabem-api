import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;

  const prisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    caminhao: {
      findUnique: jest.fn(),
    },
    documento: {
      count: jest.fn(),
    },
    abastecimento: {
      count: jest.fn(),
    },
  };

  const userId = 1;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new UsersService(prisma as any);
  });

 
  it('deve criar usuario com dados validos', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: 1,
      nome: 'João Silva',
      email: 'joao@email.com',
      senhaHash: 'hash',
      cpfEncrypted: 'enc',
      cpfHash: 'hash',
      telefone: null,
      avatarUrl: null,
      status: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.create({
      nome: 'João Silva',
      email: 'joao@email.com',
      senha: '123456',
      cpf: '529.982.247-25',
    } as any);

    expect(prisma.user.create).toHaveBeenCalled();
    expect(result).not.toHaveProperty('senhaHash');
    expect(result).not.toHaveProperty('cpfEncrypted');
    expect(result).not.toHaveProperty('cpfHash');
  });

  it('deve impedir cadastro com CPF invalido', async () => {
    await expect(
      service.create({
        nome: 'João',
        email: 'joao@email.com',
        senha: '123456',
        cpf: '111.111.111-11',
      } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve impedir cadastro com CPF ja existente', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 2 });

    await expect(
      service.create({
        nome: 'João',
        email: 'joao@email.com',
        senha: '123456',
        cpf: '529.982.247-25',
      } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('deve impedir cadastro com e-mail ja existente', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // CPF não existe
      .mockResolvedValueOnce({ id: 2 }); // e-mail já existe

    await expect(
      service.create({
        nome: 'João',
        email: 'joao@email.com',
        senha: '123456',
        cpf: '529.982.247-25',
      } as any),
    ).rejects.toThrow(ConflictException);
  });


  it('deve retornar usuario pelo id', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: userId,
      nome: 'João',
      email: 'joao@email.com',
      telefone: null,
      avatarUrl: null,
      status: true,
      createdAt: new Date(),
    });

    const result = await service.findById(userId);

    expect(result.id).toBe(userId);
    expect(result).not.toHaveProperty('senhaHash');
  });

  it('deve lancar erro ao buscar usuario inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.findById(999)).rejects.toThrow(BadRequestException);
  });

 
  it('deve atualizar dados do usuario', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.user.update.mockResolvedValue({
      id: userId,
      nome: 'João Atualizado',
      email: 'joao@email.com',
      telefone: null,
      avatarUrl: null,
      status: true,
    });

    const result = await service.update(userId, { nome: 'João Atualizado' });

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { nome: 'João Atualizado' },
      select: expect.any(Object),
    });
    expect(result.nome).toBe('João Atualizado');
  });

  it('deve lancar erro ao atualizar usuario inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.update(999, { nome: 'Teste' }),
    ).rejects.toThrow(NotFoundException);
  });


  it('deve excluir usuario sem vinculos', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.caminhao.findUnique.mockResolvedValue(null);
    prisma.documento.count.mockResolvedValue(0);
    prisma.abastecimento.count.mockResolvedValue(0);
    prisma.user.delete.mockResolvedValue({ id: userId });

    const result = await service.remove(userId);

    expect(prisma.user.delete).toHaveBeenCalledWith({ where: { id: userId } });
    expect(result.message).toContain('excluído com sucesso');
  });

  it('deve impedir exclusao de usuario com caminhao vinculado', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.caminhao.findUnique.mockResolvedValue({ id: 10, userId });

    await expect(service.remove(userId)).rejects.toThrow(BadRequestException);
  });

  it('deve impedir exclusao de usuario com documentos vinculados', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.caminhao.findUnique.mockResolvedValue(null);
    prisma.documento.count.mockResolvedValue(3);

    await expect(service.remove(userId)).rejects.toThrow(BadRequestException);
  });

  it('deve impedir exclusao de usuario com abastecimentos vinculados', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: userId });
    prisma.caminhao.findUnique.mockResolvedValue(null);
    prisma.documento.count.mockResolvedValue(0);
    prisma.abastecimento.count.mockResolvedValue(2);

    await expect(service.remove(userId)).rejects.toThrow(BadRequestException);
  });

  it('deve lancar erro ao excluir usuario inexistente', async () => {
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(service.remove(999)).rejects.toThrow(NotFoundException);
  });


  it('deve alterar senha com senha atual correta', async () => {
    const bcrypt = require('bcrypt');
    const senhaHash = await bcrypt.hash('senha123', 10);

    prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });
    prisma.user.update.mockResolvedValue({ id: userId });

    const result = await service.alterarSenha(userId, {
      senhaAtual: 'senha123',
      novaSenha: 'novaSenha456',
    });

    expect(prisma.user.update).toHaveBeenCalled();
    expect(result.message).toContain('Senha alterada com sucesso');
  });

  it('deve impedir troca de senha com senha atual incorreta', async () => {
    const bcrypt = require('bcrypt');
    const senhaHash = await bcrypt.hash('senha123', 10);

    prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });

    await expect(
      service.alterarSenha(userId, {
        senhaAtual: 'senhaErrada',
        novaSenha: 'novaSenha456',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('deve impedir troca de senha com nova senha curta', async () => {
    const bcrypt = require('bcrypt');
    const senhaHash = await bcrypt.hash('senha123', 10);

    prisma.user.findUnique.mockResolvedValue({ id: userId, senhaHash });

    await expect(
      service.alterarSenha(userId, {
        senhaAtual: 'senha123',
        novaSenha: '123',
      }),
    ).rejects.toThrow(BadRequestException);
  });
});