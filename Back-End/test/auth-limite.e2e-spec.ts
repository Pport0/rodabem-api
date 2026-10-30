import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { clearDatabase, registerAndLogin } from './e2e.utils';

describe('Limite de requisicoes em autenticacao (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
        stopAtFirstError: true,
      }),
    );
    await app.init();
    await app.listen(0);

    prisma = app.get(PrismaService);
    await clearDatabase(prisma);
  });

  afterAll(async () => {
    await clearDatabase(prisma);
    await app.close();
  });

  it('deve recusar novas tentativas depois de uma sequencia de falhas', async () => {
    const { user } = await registerAndLogin(app, '500030');

    let ultimaResposta = 0;

    for (let i = 0; i < 20; i++) {
      const resposta = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ telefone: user.telefone, senha: `tentativa-${i}` });

      ultimaResposta = resposta.status;
      if (resposta.status === 429) break;
    }

    expect(ultimaResposta).toBe(429);
  });

  it('deve limitar os pedidos de recuperacao de senha', async () => {
    let ultimaResposta = 0;

    for (let i = 0; i < 20; i++) {
      const resposta = await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({ email: `desconhecido${i}@example.com` });

      ultimaResposta = resposta.status;
      if (resposta.status === 429) break;
    }

    expect(ultimaResposta).toBe(429);
  });
});
