import {
  ComposicaoVeicular,
  PrismaClient,
  TipoCarga,
} from '@prisma/client';
import { seedAntt } from '../prisma/seeds/antt.seed';

const EIXOS_PUBLICADOS = [2, 3, 4, 5, 6, 7, 9];
const TIPOS_ACEITOS = Object.values(TipoCarga);
const COMPOSICOES = Object.values(ComposicaoVeicular);

describe('Tabela da ANTT distribuida com a aplicacao', () => {
  const prisma = new PrismaClient();
  let versaoId: number;

  beforeAll(async () => {
    await seedAntt();

    const versao = await prisma.versaoAntt.findFirst({
      orderBy: { vigenteDesde: 'desc' },
    });

    versaoId = versao!.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const coeficiente = (
    numeroEixos: number,
    tipoCarga: TipoCarga,
    altoDesempenho: boolean,
    composicaoVeicular: ComposicaoVeicular = ComposicaoVeicular.COM_CARRETA,
  ) =>
    prisma.tabelaAntt.findFirst({
      where: {
        versaoId,
        numeroEixos,
        tipoCarga,
        altoDesempenho,
        composicaoVeicular,
      },
    });

  it('deve ter uma versao vigente para a simulacao usar', async () => {
    const vigente = await prisma.versaoAntt.findFirst({
      where: {
        vigenteDesde: { lte: new Date() },
        OR: [{ vigenteAte: null }, { vigenteAte: { gte: new Date() } }],
      },
    });

    expect(vigente).not.toBeNull();
  });

  it('nao deve publicar faixa de eixos que a ANTT nao reconhece', async () => {
    const eixos = await prisma.tabelaAntt.findMany({
      where: { versaoId },
      distinct: ['numeroEixos'],
      select: { numeroEixos: true },
      orderBy: { numeroEixos: 'asc' },
    });

    expect(eixos.map((e) => e.numeroEixos)).toEqual(EIXOS_PUBLICADOS);
  });

  describe('combinacoes que a API aceita', () => {
    it.each(
      COMPOSICOES.flatMap((composicao) =>
        [false, true].map((alto) => [composicao, alto] as const),
      ),
    )(
      'todo tipo de carga deve ter ao menos um numero de eixos em %s com alto desempenho %s',
      async (composicao, alto) => {
        const semNenhum: string[] = [];

        for (const tipoCarga of TIPOS_ACEITOS) {
          const algum = await prisma.tabelaAntt.findFirst({
            where: {
              versaoId,
              tipoCarga,
              altoDesempenho: alto,
              composicaoVeicular: composicao,
            },
          });

          if (!algum) semNenhum.push(tipoCarga);
        }

        expect(semNenhum).toEqual([]);
      },
    );

    it('deve dar coeficiente diferente ao veiculo de alto desempenho', async () => {
      const comum = await coeficiente(6, TipoCarga.GERAL, false);
      const alto = await coeficiente(6, TipoCarga.GERAL, true);

      expect(alto).not.toBeNull();
      expect(alto!.valorPorKm).not.toBe(comum!.valorPorKm);
    });

    it('deve dar coeficiente diferente a quem roda sem carreta', async () => {
      const comCarreta = await coeficiente(
        6,
        TipoCarga.GERAL,
        false,
        ComposicaoVeicular.COM_CARRETA,
      );
      const semCarreta = await coeficiente(
        6,
        TipoCarga.GERAL,
        false,
        ComposicaoVeicular.SEM_CARRETA,
      );

      expect(semCarreta).not.toBeNull();
      expect(semCarreta!.valorPorKm).not.toBe(comCarreta!.valorPorKm);
    });
  });
});
