import { PrismaClient } from '@prisma/client';
import { seedAntt } from '../../prisma/seeds/antt.seed';

const prisma = new PrismaClient();

const CARGAS = [
  'GERAL',
  'GRANEL_SOLIDO',
  'GRANEL_LIQUIDO',
  'FRIGORIFICADA',
  'PERIGOSA',
  'CONTEINER',
];

const EIXOS = [2, 3, 4, 5, 6, 7, 9];

const VOLUMES = [30, 1_000, 10_000, 100_000];
const REPETICOES = 20;

async function preencher(quantidade: number) {
  await prisma.$executeRawUnsafe('TRUNCATE TABLE tabela_antt RESTART IDENTITY');

  const LOTE = 2_000;
  let criados = 0;

  while (criados < quantidade) {
    const fim = Math.min(criados + LOTE, quantidade);
    const lote = [];

    for (let i = criados; i < fim; i++) {
      const faixa = Math.floor(i / (EIXOS.length * CARGAS.length));
      lote.push({
        numeroEixos: EIXOS[i % EIXOS.length],
        tipoCarga: CARGAS[Math.floor(i / EIXOS.length) % CARGAS.length] as never,
        distanciaMin: faixa * 50,
        distanciaMax: faixa * 50 + 49,
        valorPorKm: 3 + (i % 100) / 100,
        atualizadoEm: new Date(),
      });
    }

    await prisma.tabelaAntt.createMany({ data: lote });
    criados = fim;
  }

  await prisma.$executeRawUnsafe('ANALYZE tabela_antt');
}

async function medir(comAcerto: boolean) {
  const eixos = comAcerto ? 6 : 8;

  const linhas = await prisma.$queryRawUnsafe<{ 'QUERY PLAN': string }[]>(
    `EXPLAIN (ANALYZE, TIMING ON)
     SELECT * FROM tabela_antt
     WHERE "numeroEixos" = ${eixos}
       AND "tipoCarga" = 'GERAL'::"TipoCarga"
       AND "distanciaMin" <= 500
       AND "distanciaMax" >= 500
     LIMIT 1`,
  );

  const texto = linhas.map((l) => l['QUERY PLAN']).join('\n');
  const tempo = Number(/Execution Time: ([\d.]+) ms/.exec(texto)?.[1] ?? 0);
  const plano = /(Seq Scan|Index Scan|Bitmap Heap Scan|Index Only Scan)/.exec(texto)?.[1] ?? '?';

  return { tempo, plano };
}

async function medianaDe(comAcerto: boolean) {
  const tempos: number[] = [];
  let plano = '?';

  for (let i = 0; i < REPETICOES; i++) {
    const medida = await medir(comAcerto);
    tempos.push(medida.tempo);
    plano = medida.plano;
  }

  tempos.sort((a, b) => a - b);
  return { mediana: tempos[Math.floor(tempos.length / 2)], plano };
}

async function main() {
  console.log('');
  console.log('  faixas | plano    | com acerto | sem acerto (varredura inteira)');
  console.log('  -------|----------|------------|-------------------------------');

  for (const volume of VOLUMES) {
    await preencher(volume);

    const acerto = await medianaDe(true);
    const vazio = await medianaDe(false);

    console.log(
      `  ${String(volume).padStart(6)} | ${vazio.plano.padEnd(8)} | ${acerto.mediana.toFixed(3).padStart(7)} ms | ${vazio.mediana.toFixed(3).padStart(7)} ms`,
    );
  }

  console.log('');
  console.log('  A coluna que importa e a ultima. Com acerto, o LIMIT 1 encerra cedo e o');
  console.log('  tamanho da tabela quase nao pesa. Sem acerto a varredura vai ate o fim, e e');
  console.log('  ai que a falta de indice em (numeroEixos, tipoCarga) aparece — se aparecer.');
  console.log('');
  console.log('  Restaurando o seed de producao...');

  await prisma.$executeRawUnsafe('TRUNCATE TABLE tabela_antt RESTART IDENTITY');
  await seedAntt();
}

main()
  .catch((erro) => {
    console.error(erro);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
