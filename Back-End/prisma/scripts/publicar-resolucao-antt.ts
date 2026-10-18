
/**
 * ROTINA DE ATUALIZAÇÃO DA TABELA ANTT
 * ─────────────────────────────────────────────────────────────────────────────
 * Execute este script sempre que a ANTT publicar uma nova resolução.
 * O seed (prisma/seeds/antt.seed.ts) nunca deve ser editado após o deploy inicial.
 *
 * PASSO A PASSO:
 *
 * 1. Acesse a resolução oficial em:
 *    https://anttlegis.antt.gov.br
 *    Procure por "Resolução" ou "Portaria SUROC" com os novos coeficientes.
 *
 * 2. Edite as duas constantes abaixo:
 *    - NOVA_RESOLUCAO  → número e ano da nova resolução (ex: 'Res. 6.084/2026')
 *    - VIGENTE_DESDE   → data de início da vigência conforme o texto oficial
 *
 * 3. Substitua todos os valorPorKm e cc pelos valores da nova tabela.
 *    Referência de colunas: CCD = valorPorKm, CC = cc
 *    Tabela A = COM_CARRETA / normal
 *    Tabela B = SEM_CARRETA / normal        (só 4+ eixos)
 *    Tabela C = COM_CARRETA / alto desempenho
 *    Tabela D = SEM_CARRETA / alto desempenho (só 4+ eixos)
 *    GRANEL_PRESSURIZADO só existe para eixos 5, 6 e 9.
 *
 * 4. Rode em produção:
 *    npx ts-node prisma/scripts/publicar-resolucao-antt.ts
 *
 * O script:
 *  - Encerra o vigenteAte da versão anterior automaticamente
 *  - Cria a nova versão
 *  - Insere os coeficientes
 *  - É idempotente: rodar duas vezes não duplica nada
 *
 * Simulações históricas continuam apontando para a versão que as gerou
 * via versaoAnttId em SimulacaoFrete.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient, TipoCarga, ComposicaoVeicular } from '@prisma/client';

const prisma = new PrismaClient();

// ─── EDITE AQUI A CADA NOVO REAJUSTE ────────────────────────────────────────

const NOVA_RESOLUCAO = 'Res. 6.084/2026';
const VIGENTE_DESDE = new Date('2026-06-01');

type Coef = {
  numeroEixos: number;
  tipoCarga: TipoCarga;
  composicaoVeicular: ComposicaoVeicular;
  altoDesempenho: boolean;
  valorPorKm: number;
  cc: number;
};

const coeficientes: Coef[] = [
  // ── Tabela A — COM_CARRETA, altoDesempenho: false ──────────────────────────
  // 2 eixos
  { numeroEixos: 2, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  // 3 eixos
  { numeroEixos: 3, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  // 7 eixos
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  // 9 eixos
  { numeroEixos: 9, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },

  // ── Tabela B — SEM_CARRETA, altoDesempenho: false (só 4+ eixos) ───────────
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  // 7 eixos
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  // 9 eixos
  { numeroEixos: 9, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 0, cc: 0 },

  // ── Tabela C — COM_CARRETA, altoDesempenho: true ───────────────────────────
  // (mesmos eixos/tipos que Tabela A — preencha com os valores da nova resolução)
  // 2 eixos
  { numeroEixos: 2, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  // 3–9 eixos omitidos por brevidade — copie o padrão acima para cada eixo/tipo

  // ── Tabela D — SEM_CARRETA, altoDesempenho: true (só 4+ eixos) ────────────
  // 4–9 eixos — mesmo padrão das tabelas B e C
];

// ────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`📋 Publicando ${NOVA_RESOLUCAO}...`);

  const jaExiste = await prisma.versaoAntt.findUnique({
    where: { resolucao: NOVA_RESOLUCAO },
  });

  if (jaExiste) {
    console.log(`⚠️  ${NOVA_RESOLUCAO} já existe (id=${jaExiste.id}). Nada feito.`);
    return;
  }

  // Fecha vigência da versão atual
  const versaoAtual = await prisma.versaoAntt.findFirst({
    where: {
      vigenteDesde: { lte: VIGENTE_DESDE },
      OR: [{ vigenteAte: null }, { vigenteAte: { gte: VIGENTE_DESDE } }],
    },
    orderBy: { vigenteDesde: 'desc' },
  });

  if (versaoAtual) {
    const umDiaAntes = new Date(VIGENTE_DESDE);
    umDiaAntes.setDate(umDiaAntes.getDate() - 1);

    await prisma.versaoAntt.update({
      where: { id: versaoAtual.id },
      data: { vigenteAte: umDiaAntes },
    });
    console.log(`🔒 ${versaoAtual.resolucao} encerrada em ${umDiaAntes.toISOString().slice(0, 10)}.`);
  }

  // Cria nova versão e insere coeficientes
  const novaVersao = await prisma.versaoAntt.create({
    data: { resolucao: NOVA_RESOLUCAO, vigenteDesde: VIGENTE_DESDE, vigenteAte: null },
  });

  await prisma.tabelaAntt.createMany({
    data: coeficientes.map(c => ({
      ...c,
      distanciaMin: 0,
      distanciaMax: 99999,
      versaoId: novaVersao.id,
    })),
  });

  console.log(`✅ ${coeficientes.length} registros inseridos para ${NOVA_RESOLUCAO} (id=${novaVersao.id}).`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());