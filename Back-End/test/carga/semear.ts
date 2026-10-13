/**
 * Semeadura de volume para os testes de carga.
 *
 * As credenciais seguem um esquema deterministico, para o script do k6 montar qualquer uma delas sem ler o banco:
 *
 *   email    carga<i>@carga.local
 *   telefone 62 + <i> com nove digitos
 *   cpf      derivado de <i>, sempre valido
 *   senha    senha123
 */
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { createHash, encrypt } from '../../src/common/utils/crypto.util';

const prisma = new PrismaClient();

export const SENHA_CARGA = 'senha123';
const MARCA = '@carga.local';

/** Mesmo algoritmo de `test/e2e.utils.ts`, para gerar CPF que passa na validacao. */
export function cpfValidoDe(indice: number): string {
  let base = `${indice}`.padStart(9, '0').slice(-9);

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

  // Uma unica cifragem de senha, reaproveitada: bcrypt custa ~100ms por chamada e semear milhares de usuarios um a
  // um levaria dezenas de minutos. Todos os usuarios de carga compartilham a mesma senha de proposito.
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
