import { INestApplication } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import * as request from 'supertest';

export const VERSAO_TERMO = '1.0';

export async function publicarTermoVigente(prisma: PrismaService) {
  const termo = await prisma.termoUso.upsert({
    where: { versao: VERSAO_TERMO },
    create: {
      versao: VERSAO_TERMO,
      conteudo: 'Termo de uso e isencao de responsabilidade para a bancada de testes.',
      ativo: true,
    },
    update: { ativo: true },
  });

  await prisma.termoUso.updateMany({
    where: { id: { not: termo.id } },
    data: { ativo: false },
  });

  return termo;
}

export async function clearDatabase(prisma: PrismaService) {
  await prisma.simulacaoFrete.deleteMany();
  await prisma.abastecimento.deleteMany();
  await prisma.documento.deleteMany();
  await prisma.caminhao.deleteMany();
  await prisma.tokenBlackList.deleteMany();
  await prisma.aceiteTermo.deleteMany();
  await prisma.user.deleteMany();
  await prisma.termoUso.deleteMany();
  await prisma.tabelaAntt.deleteMany();
  await prisma.versaoAntt.deleteMany();

  await publicarTermoVigente(prisma);
}

export function buildValidCpf(seed: string): string {
  let base = `${seed}`.replace(/\D/g, '').padStart(9, '0').slice(-9);

  if (/^(\d)\1{8}$/.test(base)) {
    base = `${(Number(base[0]) + 1) % 10}${base.slice(1)}`;
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
    termoVersao: VERSAO_TERMO,
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

export const semLimiteDeRequisicoes = {
  increment: async () => ({
    totalHits: 1,
    timeToExpire: 60,
    isBlocked: false,
    timeToBlockExpire: 0,
  }),
};
