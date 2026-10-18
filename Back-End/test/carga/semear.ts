import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, encrypt } from '../../src/common/utils/crypto.util';

const prisma = new PrismaClient();

export const SENHA_CARGA = 'senha123';
const MARCA = '@carga.local';

export function cpfValidoDe(indice: number): string {
  if (indice >= 100_000_000) {
    throw new Error(`indice fora da faixa suportada: ${indice}`);
  }

  let base = `${indice}`.padStart(9, '0').slice(-9);

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
  return `${base}${primeiro}${digito(`${base}${primeiro}`, 11)}`;
}

export const emailDe = (i: number) => `carga${i}${MARCA}`;
export const telefoneDe = (i: number) => `62${String(i).padStart(9, '0')}`;

async function limpar() {
  const alvo = { user: { email: { endsWith: MARCA } } };

  await prisma.simulacaoFrete.deleteMany({ where: alvo });
  await prisma.abastecimento.deleteMany({ where: alvo });
  await prisma.documento.deleteMany({ where: alvo });
  await prisma.caminhao.deleteMany({ where: alvo });
  const { count } = await prisma.user.deleteMany({
    where: { email: { endsWith: MARCA } },
  });

  console.log(`removidos ${count} usuarios de carga`);
}

async function semear(quantidade: number) {
  const existentes = await prisma.user.count({
    where: { email: { endsWith: MARCA } },
  });

  if (existentes >= quantidade) {
    console.log(
      `ja existem ${existentes} usuarios de carga; nada a fazer. ` +
        `Use "limpar" para recomecar.`,
    );
    return;
  }

  const senhaHash = await bcrypt.hash(SENHA_CARGA, 10);

  const LOTE = 500;
  let criados = 0;

  for (let inicio = existentes; inicio < quantidade; inicio += LOTE) {
    const fim = Math.min(inicio + LOTE, quantidade);
    const lote = [];

    for (let i = inicio; i < fim; i++) {
      const cpf = cpfValidoDe(i);
      lote.push({
        nome: `Carga ${i}`,
        email: emailDe(i),
        telefone: telefoneDe(i),
        senhaHash,
        cpfEncrypted: encrypt(cpf),
        cpfHash: createHash(cpf),
      });
    }

    const { count } = await prisma.user.createMany({
      data: lote,
      skipDuplicates: true,
    });
    criados += count;
    process.stdout.write(`\r${criados} usuarios semeados`);
  }

  console.log('');

  const total = await prisma.user.count({
    where: { email: { endsWith: MARCA } },
  });

  console.log(`total de usuarios de carga: ${total}`);
  console.log(`primeiro  cpf=${cpfValidoDe(0)} telefone=${telefoneDe(0)}`);
  console.log(
    `ultimo    cpf=${cpfValidoDe(total - 1)} telefone=${telefoneDe(total - 1)}`,
  );
}

async function main() {
  const argumento = process.argv[2] ?? '5000';

  if (argumento === 'limpar') {
    await limpar();
    return;
  }

  const quantidade = Number(argumento);

  if (!Number.isInteger(quantidade) || quantidade < 1) {
    throw new Error(`quantidade invalida: ${argumento}`);
  }

  await semear(quantidade);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
