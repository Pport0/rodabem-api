import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';

import { AuthController } from './auth.controller';
import { AuthModule } from './auth.module';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthModule', () => {
  const prismaFalso = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    user: { findFirst: jest.fn(), findMany: jest.fn(), findUnique: jest.fn() },
    tokenBlackList: { create: jest.fn(), findFirst: jest.fn() },
  };

  
  const SEGREDO_DE_PROCESSO = 'segredo-de-processo';
  let envOriginal: string | undefined;

  const compilarCom = async (env: Record<string, string | undefined>) => {
    const moduleRef = Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, load: [() => env] }),
        AuthModule,
      ],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaFalso);

    return moduleRef.compile();
  };

  const envValido = { JWT_SECRET: 'segredo-de-teste', JWT_EXPIRES_IN: '1d' };

  beforeAll(() => {
    envOriginal = process.env.JWT_SECRET;
    process.env.JWT_SECRET = SEGREDO_DE_PROCESSO;
  });

  afterAll(() => {
    if (envOriginal === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = envOriginal;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('composicao do modulo', () => {
    it('deve resolver o AuthService, o AuthController e a JwtStrategy', async () => {
      const mod = await compilarCom(envValido);

      expect(mod.get(AuthService)).toBeInstanceOf(AuthService);
      expect(mod.get(AuthController)).toBeInstanceOf(AuthController);
      expect(mod.get(JwtStrategy)).toBeInstanceOf(JwtStrategy);

      await mod.close();
    });

    it('deve expor o JwtModule para os modulos que importarem AuthModule', async () => {
      const mod = await compilarCom(envValido);

      expect(mod.get(JwtService)).toBeInstanceOf(JwtService);

      await mod.close();
    });
  });

  describe('configuracao do token', () => {
    const semSegredoNoProcesso = async (fn: () => Promise<void>) => {
      delete process.env.JWT_SECRET;
      try {
        await fn();
      } finally {
        process.env.JWT_SECRET = SEGREDO_DE_PROCESSO;
      }
    };

    it('deve recusar a inicializacao quando JWT_SECRET nao esta definido', async () => {
      await semSegredoNoProcesso(async () => {
        await expect(
          compilarCom({ JWT_SECRET: undefined, JWT_EXPIRES_IN: '1d' }),
        ).rejects.toThrow();
      });
    });

    it('deve recusar a inicializacao quando JWT_SECRET esta vazio', async () => {
      await semSegredoNoProcesso(async () => {
        await expect(
          compilarCom({ JWT_SECRET: '', JWT_EXPIRES_IN: '1d' }),
        ).rejects.toThrow();
      });
    });

    it('deve assinar o token com o segredo configurado', async () => {
      const mod = await compilarCom(envValido);
      const jwt = mod.get(JwtService);

      const token = jwt.sign({ sub: 1 });

      expect(jwt.verify(token, { secret: 'segredo-de-teste' })).toMatchObject({
        sub: 1,
      });
      await mod.close();
    });

    it('deve usar o tempo de expiracao informado em JWT_EXPIRES_IN', async () => {
      const mod = await compilarCom({ JWT_SECRET: 'segredo-de-teste', JWT_EXPIRES_IN: '60s' });
      const jwt = mod.get(JwtService);

      const { iat, exp } = jwt.decode(jwt.sign({ sub: 1 })) as any;

      expect(exp - iat).toBe(60);
      await mod.close();
    });

    it('assina o token com o segredo do ConfigService, nao com o de process.env', async () => {
      const mod = await compilarCom(envValido);
      const jwt = mod.get(JwtService);

      const token = jwt.sign({ sub: 1 });

      expect(() => jwt.verify(token, { secret: 'segredo-de-teste' })).not.toThrow();
      expect(() => jwt.verify(token, { secret: SEGREDO_DE_PROCESSO })).toThrow();

      await mod.close();
    });

    it('deve aplicar o padrao de 7 dias quando JWT_EXPIRES_IN nao e informado', async () => {
      const mod = await compilarCom({ JWT_SECRET: 'segredo-de-teste', JWT_EXPIRES_IN: undefined });
      const jwt = mod.get(JwtService);

      const { iat, exp } = jwt.decode(jwt.sign({ sub: 1 })) as any;

      expect(exp - iat).toBe(7 * 24 * 60 * 60);
      await mod.close();
    });
  });
});
