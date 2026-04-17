import { PrismaClient, TipoCarga } from '@prisma/client';

const prisma = new PrismaClient();

// Valores baseados na Resolução ANTT 6.métrica — atualize conforme publicação vigente
const tabelaAntt = [
  // 2 eixos
  { numeroEixos: 2, tipoCarga: TipoCarga.GERAL,           distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 3.0638 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_SOLIDO,   distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 2.7574 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_LIQUIDO,  distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 3.2170 },
  { numeroEixos: 2, tipoCarga: TipoCarga.FRIGORIFICADA,   distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 3.8265 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA,        distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 3.8265 },
  { numeroEixos: 2, tipoCarga: TipoCarga.CONTEINER,       distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 3.0638 },
  // 3 eixos
  { numeroEixos: 3, tipoCarga: TipoCarga.GERAL,           distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 3.5602 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_SOLIDO,   distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 3.2042 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_LIQUIDO,  distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 3.7382 },
  { numeroEixos: 3, tipoCarga: TipoCarga.FRIGORIFICADA,   distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 4.4453 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA,        distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 4.4453 },
  { numeroEixos: 3, tipoCarga: TipoCarga.CONTEINER,       distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 3.5602 },
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,           distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 4.0566 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,   distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 3.6509 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,  distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 4.2594 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,   distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 5.0641 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA,        distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 5.0641 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,       distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 4.0566 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,           distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 4.5530 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,   distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 4.0977 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,  distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 4.7807 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,   distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 5.6829 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA,        distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 5.6829 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,       distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 4.5530 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,           distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 5.0494 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,   distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 4.5445 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,  distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 5.3020 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,   distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 6.3017 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA,        distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 6.3017 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,       distanciaMin: 0,    distanciaMax: 99999, valorPorKm: 5.0494 },
];

export async function seedAntt() {
  console.log('🌱 Iniciando seed da Tabela ANTT...');

  await prisma.tabelaAntt.deleteMany(); // limpa antes de recriar

  for (const item of tabelaAntt) {
    await prisma.tabelaAntt.create({
      data: {
        ...item,
        atualizadoEm: new Date('2025-01-01'),
      },
    });
  }

  console.log(`✅ ${tabelaAntt.length} registros da Tabela ANTT inseridos.`);
}