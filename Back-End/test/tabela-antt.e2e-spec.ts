import { execFileSync } from 'child_process';
import * as path from 'path';
import { PrismaClient } from '@prisma/client';

describe('Tabela da ANTT distribuida (e2e)', () => {
  const RAIZ = path.resolve(__dirname, '..');
  let prisma: PrismaClient;

  const EIXOS_DA_ANTT = [2, 3, 4, 5, 6, 7, 9];

  const CARGAS_DA_ANTT = [
    'Carga Geral',
    'Carga Granel Pressurizada',
    'Conteinerizada',
    'Frigorificada ou Aquecida',
    'Granel liquido',
    'Granel solido',
    'Neogranel',
    'Perigosa (carga geral)',
    'Perigosa (conteinerizada)',
    'Perigosa (frigorificada ou aquecida)',
    'Perigosa (granel liquido)',
    'Perigosa (granel solido)',
  ];

  beforeAll(async () => {
    execFileSync('npx', ['ts-node', 'prisma/seed.ts'], {
      cwd: RAIZ,
      stdio: 'ignore',
    });

    prisma = new PrismaClient();
    await prisma.$connect();
  }, 120000);

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('deve cobrir todos os numeros de eixos que a ANTT publica', async () => {
    const faixas = await prisma.tabelaAntt.findMany({
      select: { numeroEixos: true },
      distinct: ['numeroEixos'],
      orderBy: { numeroEixos: 'asc' },
    });

    expect(faixas.map((f) => f.numeroEixos)).toEqual(EIXOS_DA_ANTT);
  });

  it('deve cobrir todos os tipos de carga que a ANTT publica', async () => {
    const tipos = await prisma.tabelaAntt.findMany({
      select: { tipoCarga: true },
      distinct: ['tipoCarga'],
    });

    expect(tipos).toHaveLength(CARGAS_DA_ANTT.length);
  });

  it('nao deve ter coeficiente zerado ou negativo', async () => {
    const invalidas = await prisma.tabelaAntt.findMany({
      where: { valorPorKm: { lte: 0 } },
      select: { numeroEixos: true, tipoCarga: true, valorPorKm: true },
    });

    expect(invalidas).toEqual([]);
  });

  describe('vigencia das versoes publicadas', () => {
    it('deve haver exatamente uma versao vigente', async () => {
      const agora = new Date();

      const vigentes = await prisma.versaoAntt.findMany({
        where: {
          vigenteDesde: { lte: agora },
          OR: [{ vigenteAte: null }, { vigenteAte: { gte: agora } }],
        },
        select: { resolucao: true },
      });

      expect(vigentes).toHaveLength(1);
    });

    it('nenhuma versao publicada deve ter coeficiente zerado ou negativo', async () => {
      const invalidas = await prisma.tabelaAntt.findMany({
        where: { OR: [{ valorPorKm: { lte: 0 } }, { cc: { lt: 0 } }] },
        select: { versaoId: true, numeroEixos: true, tipoCarga: true },
      });

      expect(invalidas).toEqual([]);
    });

    it('toda versao publicada deve ter coeficiente', async () => {
      const versoes = await prisma.versaoAntt.findMany({ select: { id: true, resolucao: true } });
      const vazias: string[] = [];

      for (const versao of versoes) {
        const quantas = await prisma.tabelaAntt.count({ where: { versaoId: versao.id } });
        if (quantas === 0) vazias.push(versao.resolucao);
      }

      expect(vazias).toEqual([]);
    });
  });

  it('nao deve ter combinacao de eixos e tipo de carga repetida', async () => {
    const todas = await prisma.tabelaAntt.findMany({
      select: {
        numeroEixos: true,
        tipoCarga: true,
        distanciaMin: true,
        distanciaMax: true,
        altoDesempenho: true,
        composicaoVeicular: true,
      },
    });

    const chaves = todas.map(
      (f) =>
        `${f.composicaoVeicular}|${f.altoDesempenho}|${f.numeroEixos}|${f.tipoCarga}|${f.distanciaMin}-${f.distanciaMax}`,
    );

    expect(chaves).toHaveLength(new Set(chaves).size);
  });
});
