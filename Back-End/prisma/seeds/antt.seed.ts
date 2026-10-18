import { PrismaClient, TipoCarga } from '@prisma/client';

const prisma = new PrismaClient();

const coeficientes = [
  // 2 eixos
  { numeroEixos: 2, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 3.0638, cc: 109.06 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 2.7574, cc:  98.15 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 3.2170, cc: 114.43 },
  { numeroEixos: 2, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 3.8265, cc: 136.13 },
  { numeroEixos: 2, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 3.0638, cc: 109.06 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 3.8265, cc: 136.13 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 3.8265, cc: 136.13 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 4.5918, cc: 163.36 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 4.5918, cc: 163.36 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 3.8265, cc: 136.13 },
  { numeroEixos: 2, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 3.60,   cc: 451.84 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 7.04,   cc: 757.81 },
  // 3 eixos
  { numeroEixos: 3, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 3.5602, cc: 126.74 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 3.2042, cc: 114.07 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 3.7382, cc: 133.08 },
  { numeroEixos: 3, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 4.4453, cc: 158.27 },
  { numeroEixos: 3, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 3.5602, cc: 126.74 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 4.4453, cc: 158.27 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 4.4453, cc: 158.27 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 5.3344, cc: 189.92 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 5.3344, cc: 189.92 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 4.4453, cc: 158.27 },
  { numeroEixos: 3, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 5.10,   cc: 541.44 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 7.04,   cc: 757.81 },
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 4.0566, cc: 144.42 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 3.6509, cc: 130.00 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 4.2594, cc: 151.64 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 5.0641, cc: 180.29 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 4.0566, cc: 144.42 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 5.0641, cc: 180.29 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 5.0641, cc: 180.29 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 6.0769, cc: 216.35 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 6.0769, cc: 216.35 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 5.0641, cc: 180.29 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 5.81,   cc: 596.35 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 7.04,   cc: 757.81 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 4.5530, cc: 162.10 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 4.0977, cc: 145.93 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 4.7807, cc: 170.21 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 5.6829, cc: 202.40 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 4.5530, cc: 162.10 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 5.6829, cc: 202.40 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 5.6829, cc: 202.40 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 6.8195, cc: 242.88 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 6.8195, cc: 242.88 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 5.6829, cc: 202.40 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 6.67,   cc: 657.56 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 7.04,   cc: 757.81 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 5.0494, cc: 179.79 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 4.5445, cc: 161.82 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 5.3020, cc: 188.78 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 6.3017, cc: 224.40 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 5.0494, cc: 179.79 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 6.3017, cc: 224.40 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 6.3017, cc: 224.40 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 7.5620, cc: 269.28 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 7.5620, cc: 269.28 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 6.3017, cc: 224.40 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 7.35,   cc: 671.93 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 7.77,   cc: 784.82 },
  // 7 eixos
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 5.5458, cc: 197.47 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 4.9912, cc: 177.72 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 5.8231, cc: 207.37 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 6.9205, cc: 246.47 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 5.5458, cc: 197.47 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 6.9205, cc: 246.47 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 6.9205, cc: 246.47 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 8.3046, cc: 295.77 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 8.3046, cc: 295.77 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 6.9205, cc: 246.47 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 8.09,   cc: 831.66 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 7.77,   cc: 784.82 },
  // 9 eixos
  { numeroEixos: 9, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 6.5386, cc: 232.84 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 5.8847, cc: 209.58 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 6.8655, cc: 244.47 },
  { numeroEixos: 9, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 8.1591, cc: 290.59 },
  { numeroEixos: 9, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 6.5386, cc: 232.84 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 8.1591, cc: 290.59 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 8.1591, cc: 290.59 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 9.7909, cc: 348.71 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 9.7909, cc: 348.71 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 8.1591, cc: 290.59 },
  { numeroEixos: 9, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 9.20,   cc: 903.32 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 9.74,   cc: 1052.26 },
].map(item => ({
  ...item,
  distanciaMin: 0,
  distanciaMax: 99999,
  altoDesempenho: false,
}));

export async function seedAntt() {
  console.log('🌱 Iniciando seed da Tabela ANTT...');

  let versao = await prisma.versaoAntt.findUnique({
    where: { resolucao: 'Res. 6.076/2026' },
  });

  if (!versao) {
    versao = await prisma.versaoAntt.create({
      data: {
        resolucao: 'Res. 6.076/2026',
        vigenteDesde: new Date('2026-01-01'),
        vigenteAte: null,
      },
    });
    console.log(`📋 Versão ANTT criada: ${versao.resolucao} (id=${versao.id})`);
  } else {
    console.log(`📋 Versão ANTT já existe: ${versao.resolucao} (id=${versao.id})`);
  }

  const jaExiste = await prisma.tabelaAntt.count({
    where: { versaoId: versao.id },
  });

  if (jaExiste === 0) {
    await prisma.tabelaAntt.createMany({
      data: coeficientes.map(item => ({ ...item, versaoId: versao.id })),
    });
    console.log(`✅ ${coeficientes.length} registros da Tabela ANTT inseridos (versão ${versao.resolucao}).`);
    return;
  }

  console.log(`📋 Tabela ANTT já tem ${jaExiste} registros. Verificando registros faltantes...`);

  for (const coef of coeficientes) {
    const jaExisteRegistro = await prisma.tabelaAntt.findFirst({
      where: {
        versaoId: versao.id,
        tipoCarga: coef.tipoCarga,
        numeroEixos: coef.numeroEixos,
      },
    });

    if (!jaExisteRegistro) {
      await prisma.tabelaAntt.create({
        data: { ...coef, versaoId: versao.id },
      });
      console.log(`✅ Inserido: ${coef.numeroEixos} eixos / ${coef.tipoCarga}`);
    }
  }

  console.log('✅ Verificação de registros faltantes concluída.');
}