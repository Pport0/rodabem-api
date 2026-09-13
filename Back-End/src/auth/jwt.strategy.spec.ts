import { UnauthorizedException } from '@nestjs/common';

describe('JwtStrategy', () => {
  let JwtStrategy: any;
  let strategy: any;

  const prisma = {
    tokenBlackList: {
      findFirst: jest.fn(),
    },
  };

  const payload = { sub: 7, email: 'gabriel@example.com' };

  const requestComToken = (token?: string) => ({
    headers: token ? { authorization: `Bearer ${token}` } : {},
  });

  beforeAll(() => {
    process.env.JWT_SECRET = 'test-secret';
    JwtStrategy = require('./jwt.strategy').JwtStrategy;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new JwtStrategy(prisma as any);
  });

  it('deve autorizar token valido que nao esta na blacklist', async () => {
    prisma.tokenBlackList.findFirst.mockResolvedValue(null);

    const result = await strategy.validate(requestComToken('jwt-token'), payload);

    expect(result).toEqual({
      userId: payload.sub,
      email: payload.email,
    });
  });

  it('deve consultar a blacklist usando o token sem o prefixo Bearer', async () => {
    prisma.tokenBlackList.findFirst.mockResolvedValue(null);

    await strategy.validate(requestComToken('jwt-token'), payload);

    expect(prisma.tokenBlackList.findFirst).toHaveBeenCalledWith({
      where: { token: 'jwt-token' },
    });
  });

  it('deve rejeitar token que esta na blacklist (logout ja realizado)', async () => {
    prisma.tokenBlackList.findFirst.mockResolvedValue({
      id: 1,
      token: 'jwt-token',
    });

    await expect(
      strategy.validate(requestComToken('jwt-token'), payload),
    ).rejects.toThrow(UnauthorizedException);
  });

  it('deve retornar o identificador do usuario a partir do claim sub', async () => {
    prisma.tokenBlackList.findFirst.mockResolvedValue(null);

    const result = await strategy.validate(requestComToken('jwt-token'), {
      sub: 42,
      email: 'outro@example.com',
    });

    expect(result.userId).toBe(42);
  });

  it('nao deve expor claims adicionais do payload no usuario autenticado', async () => {
    prisma.tokenBlackList.findFirst.mockResolvedValue(null);

    const result = await strategy.validate(requestComToken('jwt-token'), {
      ...payload,
      role: 'ADMIN',
      senhaHash: 'nao-deveria-vazar',
    });

    expect(Object.keys(result).sort()).toEqual(['email', 'userId']);
  });

  it('deve consultar a blacklist com token indefinido quando nao ha header authorization', async () => {
    prisma.tokenBlackList.findFirst.mockResolvedValue(null);

    await strategy.validate(requestComToken(), payload);

    expect(prisma.tokenBlackList.findFirst).toHaveBeenCalledWith({
      where: { token: undefined },
    });
  });
});
