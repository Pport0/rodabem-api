import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { decrypt } from '../common/utils/crypto.util';

jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

jest.mock('../common/utils/crypto.util', () => ({
  decrypt: jest.fn(),
}));

describe('AuthService', () => {
  let service: AuthService;

  const prisma = {
    user: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    tokenBlackList: {
      create: jest.fn(),
    },
  };

  const jwtService = {
    signAsync: jest.fn(),
  };

  const activeUser = {
    id: 1,
    nome: 'Gabriel',
    email: 'gabriel@example.com',
    telefone: '62999999999',
    cpfEncrypted: 'encrypted-cpf',
    senhaHash: 'hashed-password',
    status: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthService(prisma as any, jwtService as any);
  });

  it('deve fazer login com telefone e senha validos', async () => {
    prisma.user.findFirst.mockResolvedValue(activeUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const result = await service.login({
      telefone: activeUser.telefone,
      senha: '123456',
    });

    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: { telefone: activeUser.telefone },
    });
    expect(result).toEqual({
      access_token: 'jwt-token',
      user: {
        id: activeUser.id,
        nome: activeUser.nome,
        email: activeUser.email,
      },
    });
  });

  it('deve fazer login com cpf e senha validos', async () => {
    prisma.user.findFirst.mockResolvedValue(undefined);
    prisma.user.findMany.mockResolvedValue([activeUser]);
    (decrypt as jest.Mock).mockReturnValue('12345678901');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('jwt-token');

    const result = await service.login({
      cpf: '12345678901',
      senha: '123456',
    });

    expect(prisma.user.findMany).toHaveBeenCalled();
    expect(result.access_token).toBe('jwt-token');
  });

  it('deve rejeitar login sem cpf e sem telefone', async () => {
    await expect(service.login({ senha: '123456' } as any)).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('deve rejeitar login com usuario inexistente', async () => {
    prisma.user.findFirst.mockResolvedValue(undefined);
    prisma.user.findMany.mockResolvedValue([]);

    await expect(
      service.login({ telefone: '62999999999', senha: '123456' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve rejeitar login com usuario inativo', async () => {
    prisma.user.findFirst.mockResolvedValue({
      ...activeUser,
      status: false,
    });

    await expect(
      service.login({ telefone: activeUser.telefone, senha: '123456' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve rejeitar login com senha incorreta', async () => {
    prisma.user.findFirst.mockResolvedValue(activeUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(false);

    await expect(
      service.login({ telefone: activeUser.telefone, senha: 'senha-errada' }),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve gerar token no login valido', async () => {
    prisma.user.findFirst.mockResolvedValue(activeUser);
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
    jwtService.signAsync.mockResolvedValue('jwt-token');

    await service.login({ telefone: activeUser.telefone, senha: '123456' });

    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: activeUser.id,
      email: activeUser.email,
    });
  });

  it('deve registrar token na blacklist no logout', async () => {
    prisma.tokenBlackList.create.mockResolvedValue({ id: 1, token: 'jwt-token' });

    const result = await service.logout('jwt-token');

    expect(prisma.tokenBlackList.create).toHaveBeenCalledWith({
      data: { token: 'jwt-token' },
    });
    expect(result).toEqual({
      message: 'Logout realizado com sucesso',
    });
  });
});
