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
 *    Tabela A = COM_CARRETA / altoDesempenho: false
 *    Tabela B = SEM_CARRETA / altoDesempenho: false  (só 4+ eixos)
 *    Tabela C = COM_CARRETA / altoDesempenho: true
 *    Tabela D = SEM_CARRETA / altoDesempenho: true   (só 4+ eixos)
 *    GRANEL_PRESSURIZADO só existe para eixos 5, 6 e 9.
 *
 * 4. Rode em produção:
 *    npx ts-node prisma/scripts/publicar-resolucao-antt.ts
 *
 *    Para publicar uma tabela intencionalmente menor que a vigente (raro):
 *    ALLOW_SMALLER=1 npx ts-node prisma/scripts/publicar-resolucao-antt.ts
 *
 * O script:
 *  - Valida todos os coeficientes antes de escrever qualquer coisa
 *  - Encerra o vigenteAte da versão anterior, cria a nova versão e insere os
 *    coeficientes numa única transação — falha em qualquer ponto não deixa o
 *    banco sem tabela vigente
 *  - É idempotente: rodar duas vezes não duplica nada
 *
 * ATENÇÃO — desfazer uma publicação errada:
 *  Apagar a versão via DELETE falha se simulações já a referenciam (FK).
 *  O caminho correto é republicar com os valores corretos (idempotência já
 *  detecta a resolução existente) ou reabrir a vigência da anterior com um
 *  UPDATE manual em versao_antt.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { PrismaClient, TipoCarga, ComposicaoVeicular } from '@prisma/client';

const prisma = new PrismaClient();

// ─── EDITE AQUI A CADA NOVO REAJUSTE ────────────────────────────────────────

const NOVA_RESOLUCAO = 'Res. 6.084/2026';
const VIGENTE_DESDE  = new Date('2026-06-01');

// ────────────────────────────────────────────────────────────────────────────

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
  // 3 eixos
  { numeroEixos: 3, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  // 7 eixos
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  // 9 eixos
  { numeroEixos: 9, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },

  // ── Tabela D — SEM_CARRETA, altoDesempenho: true (só 4+ eixos) ────────────
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  // 7 eixos
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  // 9 eixos
  { numeroEixos: 9, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 0, cc: 0 },
];

// ────────────────────────────────────────────────────────────────────────────

/** Trava 1: aborta se qualquer coeficiente não foi preenchido. */
function validarCoeficientes(): void {
  const invalidos = coeficientes.filter(c => c.valorPorKm <= 0 || c.cc < 0);
  if (invalidos.length > 0) {
    const exemplos = invalidos.slice(0, 3)
      .map(c => `  eixos=${c.numeroEixos} ${c.tipoCarga} ${c.composicaoVeicular} altoDesempenho=${c.altoDesempenho}`)
      .join('\n');
    throw new Error(
      `❌ ${invalidos.length} coeficiente(s) com valorPorKm <= 0 ou cc < 0.\n` +
      `Preencha todos os valores antes de publicar. Exemplos:\n${exemplos}`,
    );
  }
}

async function main() {
  console.log(`📋 Publicando ${NOVA_RESOLUCAO}...`);

  // ── Trava 1: validar coeficientes antes de tocar o banco ──────────────────
  validarCoeficientes();

  // ── Idempotência ──────────────────────────────────────────────────────────
  const jaExiste = await prisma.versaoAntt.findUnique({
    where: { resolucao: NOVA_RESOLUCAO },
  });
  if (jaExiste) {
    console.log(`⚠️  ${NOVA_RESOLUCAO} já existe (id=${jaExiste.id}). Nada feito.`);
    return;
  }

  // ── Trava 2: cobertura >= versão vigente ──────────────────────────────────
  const versaoAtual = await prisma.versaoAntt.findFirst({
    where: {
      vigenteDesde: { lte: VIGENTE_DESDE },
      OR: [{ vigenteAte: null }, { vigenteAte: { gte: VIGENTE_DESDE } }],
    },
    orderBy: { vigenteDesde: 'desc' },
    include: { _count: { select: { tabela: true } } },
  });

  if (versaoAtual) {
    const linhasVigentes = versaoAtual._count.tabela;
    const linhasNovas    = coeficientes.length;

    if (linhasNovas < linhasVigentes && process.env.ALLOW_SMALLER !== '1') {
      throw new Error(
        `❌ A nova tabela tem ${linhasNovas} linhas, mas a versão vigente (${versaoAtual.resolucao}) tem ${linhasVigentes}.\n` +
        `Publicar tabela menor é quase sempre engano.\n` +
        `Se for intencional, rode com: ALLOW_SMALLER=1 npx ts-node prisma/scripts/publicar-resolucao-antt.ts`,
      );
    }
  }

  // ── Trava 3: VIGENTE_DESDE deve ser posterior ao início da versão vigente ──
  if (versaoAtual && VIGENTE_DESDE <= versaoAtual.vigenteDesde) {
    throw new Error(
      `❌ VIGENTE_DESDE (${VIGENTE_DESDE.toISOString().slice(0, 10)}) não é posterior ao início da versão vigente\n` +
      `   ${versaoAtual.resolucao} (${versaoAtual.vigenteDesde.toISOString().slice(0, 10)}). Confira a data no texto da resolução.`,
    );
  }

  // ── Trava 4: tudo em uma única transação ──────────────────────────────────
  const umDiaAntes = new Date(VIGENTE_DESDE);
  umDiaAntes.setDate(umDiaAntes.getDate() - 1);

  await prisma.$transaction(async (tx) => {
    if (versaoAtual) {
      await tx.versaoAntt.update({
        where: { id: versaoAtual.id },
        data:  { vigenteAte: umDiaAntes },
      });
      console.log(`🔒 ${versaoAtual.resolucao} encerrada em ${umDiaAntes.toISOString().slice(0, 10)}.`);
    }

    const novaVersao = await tx.versaoAntt.create({
      data: { resolucao: NOVA_RESOLUCAO, vigenteDesde: VIGENTE_DESDE, vigenteAte: null },
    });

    await tx.tabelaAntt.createMany({
      data: coeficientes.map(c => ({
        ...c,
        distanciaMin: 0,
        distanciaMax: 99999,
        versaoId: novaVersao.id,
      })),
    });

    console.log(`✅ ${coeficientes.length} registros inseridos para ${NOVA_RESOLUCAO} (id=${novaVersao.id}).`);
  });
}

main()
  .catch(e => { console.error(e.message ?? e); process.exit(1); })
  .finally(() => prisma.$disconnect());