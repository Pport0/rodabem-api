import { PrismaClient, TipoCarga } from '@prisma/client';

const prisma = new PrismaClient();

const MARCA = '@carga.local';

const TIPOS = Object.values(TipoCarga);

async function usuariosDeCarga(limite: number) {
  return prisma.user.findMany({
    where: { email: { endsWith: MARCA } },
    select: { id: true },
    orderBy: { id: 'asc' },
    take: limite,
  });
}

async function darCaminhoes(quantidade: number) {
  const usuarios = await usuariosDeCarga(quantidade);

  if (usuarios.length === 0) {
    throw new Error(
      'nenhum usuario de carga no banco. Rode antes: npx ts-node test/carga/semear.ts 8000',
    );
  }

  const jaTem = new Set(
    (
      await prisma.caminhao.findMany({
        where: { userId: { in: usuarios.map((u) => u.id) } },
        select: { userId: true },
      })
    ).map((c) => c.userId),
  );

  const faltam = usuarios.filter((u) => !jaTem.has(u.id));

  if (faltam.length > 0) {
    await prisma.caminhao.createMany({
      data: faltam.map((u, i) => ({
        userId: u.id,
        placa: `CRG${String(i % 10000).padStart(4, '0')}`,
        modelo: 'FH 460',
        renavam: String(10000000000 + i),
        numeroEixos: 2 + (i % 5),
      })),
      skipDuplicates: true,
    });
  }

  console.log(`caminhoes: ${jaTem.size} ja existiam, ${faltam.length} criados`);
  return usuarios;
}

async function espalharSimulacoes(
  usuarios: { id: number }[],
  quantidade: number,
) {
  const caminhoes = await prisma.caminhao.findMany({
    where: { userId: { in: usuarios.map((u) => u.id) } },
    select: { id: true, userId: true },
  });

  if (caminhoes.length === 0) throw new Error('nenhum caminhao de carga');

  const existentes = await prisma.simulacaoFrete.count({
    where: { user: { email: { endsWith: MARCA } } },
  });

  if (existentes >= quantidade) {
    console.log(
      `ja existem ${existentes} simulacoes de carga; nada a fazer. Use "limpar" para recomecar.`,
    );
    return;
  }

  const LOTE = 2000;
  let criadas = 0;

  for (let inicio = existentes; inicio < quantidade; inicio += LOTE) {
    const fim = Math.min(inicio + LOTE, quantidade);
    const lote = [];

    for (let i = inicio; i < fim; i++) {
      const dono = caminhoes[i % caminhoes.length];
      const km = 50 + (i % 3000);

      lote.push({
        origem: `Origem ${i % 500}`,
        destino: `Destino ${i % 500}`,
        distanciaKm: km,
        pedagiosEstimados: 0,
        consumoMedioKmL: 3.5,
        precoCombustivel: 6.2,
        litrosNecessarios: km / 3.5,
        custoCombustivel: (km / 3.5) * 6.2,
        tipoCarga: TIPOS[i % TIPOS.length],
        retornoVazio: i % 3 === 0,
        altoDesempenho: i % 7 === 0,
        valorMinimoAntt: km * 5.1771 + 220.31,
        valorLiquidoEstimado: km * 5.1771 + 220.31 - (km / 3.5) * 6.2,
        userId: dono.userId,
        caminhaoId: dono.id,
      });
    }

    const { count } = await prisma.simulacaoFrete.createMany({ data: lote });
    criadas += count;
    process.stdout.write(`\r${criadas} simulacoes semeadas`);
  }

  console.log('');

  const total = await prisma.simulacaoFrete.count({
    where: { user: { email: { endsWith: MARCA } } },
  });
  const doPrimeiro = await prisma.simulacaoFrete.count({
    where: { userId: usuarios[0].id },
  });

  console.log(`total de simulacoes de carga: ${total}`);
  console.log(
    `o usuario da rodada tem ${doPrimeiro} — ${((100 * doPrimeiro) / total).toFixed(2)}% da tabela`,
  );
}

async function limpar() {
  const alvo = { user: { email: { endsWith: MARCA } } };

  const { count: simulacoes } =
    await prisma.simulacaoFrete.deleteMany({ where: alvo });
  const { count: caminhoes } = await prisma.caminhao.deleteMany({
    where: alvo,
  });

  console.log(
    `removidas ${simulacoes} simulacoes e ${caminhoes} caminhoes de carga`,
  );
}

async function main() {
  if (process.argv[2] === 'limpar') {
    await limpar();
    return;
  }

  const usuarios = Number(process.argv[2] ?? '2000');
  const simulacoes = Number(process.argv[3] ?? '50000');

  if (!Number.isInteger(usuarios) || usuarios < 1) {
    throw new Error(`quantidade de usuarios invalida: ${process.argv[2]}`);
  }
  if (!Number.isInteger(simulacoes) || simulacoes < 1) {
    throw new Error(`quantidade de simulacoes invalida: ${process.argv[3]}`);
  }

  const comCaminhao = await darCaminhoes(usuarios);
  await espalharSimulacoes(comCaminhao, simulacoes);
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
