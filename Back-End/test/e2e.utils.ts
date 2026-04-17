import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import * as request from 'supertest';

export async function clearDatabase(prisma: PrismaService) {
  await prisma.simulacaoFrete.deleteMany();
  await prisma.abastecimento.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.caminhao.deleteMany();
  await prisma.tokenBlackList.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tabelaAntt.deleteMany();
}

export function buildUserPayload(suffix: string) {
  return {
    nome: `Usuario ${suffix}`,
    email: `usuario.${suffix}@example.com`,
    senha: '123456',
    cpf: `${suffix}`.padStart(11, '1').slice(0, 11),
    telefone: `62999${suffix.padStart(6, '0').slice(0, 6)}`,
  };
}

export async function registerAndLogin(
  app: INestApplication,
  suffix: string,
) {
  const user = buildUserPayload(suffix);

  await request(app.getHttpServer()).post('/users').send(user).expect(201);

  const loginResponse = await request(app.getHttpServer())
    .post('/auth/login')
    .send({
      telefone: user.telefone,
      senha: user.senha,
    })
    .expect(201);

  return {
    user,
    token: loginResponse.body.access_token as string,
  };
}

export function createTruck(
  app: INestApplication,
  token: string,
  overrides: Record<string, unknown> = {},
) {
  return request(app.getHttpServer())
    .post('/caminhao')
    .set('Authorization', `Bearer ${token}`)
    .send({
      placa: 'ABC1D23',
      modelo: 'FH 540',
      renavam: '12345678901',
      numeroEixos: 6,
      ...overrides,
    });
}
