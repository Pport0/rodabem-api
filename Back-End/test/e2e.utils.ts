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

export function buildValidCpf(seed: string): string {
  let base = `${seed}`.replace(/\D/g, '').padStart(9, '0').slice(-9);

  if (/^(\d)\1{8}$/.test(base)) {
    base = base.slice(0, 8) + ((Number(base[8]) + 1) % 10);
  }

  const digito = (parcial: string, pesoInicial: number) => {
    let soma = 0;
    for (let i = 0; i < parcial.length; i++) {
      soma += Number(parcial[i]) * (pesoInicial - i);
    }
    const resto = (soma * 10) % 11;
    return resto === 10 || resto === 11 ? 0 : resto;
  };

  const primeiro = digito(base, 10);
  const segundo = digito(`${base}${primeiro}`, 11);

  return `${base}${primeiro}${segundo}`;
}

export function buildUserPayload(suffix: string) {
  return {
    nome: `Usuario ${suffix}`,
    email: `usuario.${suffix}@example.com`,
    senha: '123456',
    cpf: buildValidCpf(suffix),
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
