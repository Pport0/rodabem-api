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
 *    Tabela B = SEM_CARRETA / altoDesempenho: false
 *    Tabela C = COM_CARRETA / altoDesempenho: true
 *    Tabela D = SEM_CARRETA / altoDesempenho: true
 *    GRANEL_PRESSURIZADO só existe para eixos 5, 6 e 9 (COM_CARRETA) ou 4, 5 e 9 (SEM_CARRETA).
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

const NOVA_RESOLUCAO = 'Portaria SUROC nº 22/2026';
const VIGENTE_DESDE  = new Date('2026-10-01');

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
  // 2 eixos (CONTEINER e PERIGOSA_CONTEINERIZADA não existem no eixo 2; GRANEL_PRESSURIZADO só a partir do eixo 5)
  { numeroEixos: 2, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 4.0738, cc: 451.84 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 4.1056, cc: 460.59 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 4.1796, cc: 471.98 },
  { numeroEixos: 2, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 4.8234, cc: 520.07 },
  { numeroEixos: 2, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 3.6743, cc: 451.84 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 4.4482, cc: 549.81 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 4.8756, cc: 608.79 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 4.9621, cc: 632.58 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 5.4315, cc: 630.88 },
  // 3 eixos
  { numeroEixos: 3, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 5.2177, cc: 541.86 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 5.2555, cc: 552.24 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 5.3511, cc: 569.57 },
  { numeroEixos: 3, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.1659, cc: 623.27 },
  { numeroEixos: 3, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 5.2282, cc: 544.75 },
  { numeroEixos: 3, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 5.2162, cc: 541.44 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 5.6021, cc: 642.55 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.0354, cc: 703.16 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.1436, cc: 732.90 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.7869, cc: 737.63 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 5.6126, cc: 645.45 },
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 5.9180, cc: 588.86 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 5.9476, cc: 597.00 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.1019, cc: 621.52 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.0345, cc: 686.63 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 5.8755, cc: 577.15 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 5.9453, cc: 596.35 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.3392, cc: 694.66 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.7644, cc: 753.03 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.8986, cc: 789.96 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.6718, cc: 807.63 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.2966, cc: 682.95 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.8284, cc: 657.56 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.8548, cc: 664.83 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.0226, cc: 693.08 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 8.0623, cc: 757.98 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.7910, cc: 647.29 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 6.8284, cc: 657.56 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.1929, cc: 757.81 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.2495, cc: 763.36 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.6715, cc: 820.86 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.8193, cc: 861.51 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 8.6996, cc: 878.98 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.2121, cc: 753.10 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.5347, cc: 671.93 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.5641, cc: 680.01 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.7372, cc: 709.72 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 8.8911, cc: 772.35 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.4986, cc: 662.01 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.5347, cc: 671.93 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.9452, cc: 784.82 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.9558, cc: 777.73 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 8.3808, cc: 836.04 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 8.5339, cc: 878.16 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 9.5284, cc: 893.35 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 7.9198, cc: 767.81 },
  // 7 eixos
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 8.2727, cc: 831.66 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 8.2316, cc: 820.34 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 8.3700, cc: 840.50 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 9.8134, cc: 982.76 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 8.2292, cc: 819.69 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 8.2727, cc: 831.66 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 8.7121, cc: 942.48 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 9.0666, cc: 981.39 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 9.1849, cc: 1013.95 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 10.4745, cc: 1110.28 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 8.6686, cc: 930.51 },
  // 9 eixos
  { numeroEixos: 9, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 9.4114, cc: 903.32 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 9.4318, cc: 908.91 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 9.5909, cc: 934.76 },
  { numeroEixos: 9, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 11.1479, cc: 1067.06 },
  { numeroEixos: 9, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 9.3486, cc: 886.05 },
  { numeroEixos: 9, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 9.4114, cc: 903.32 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 9.9531, cc: 1052.26 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 9.8588, cc: 1016.33 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 10.2747, cc: 1072.15 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 10.4138, cc: 1110.41 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 11.8192, cc: 1197.43 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, valorPorKm: 9.7960, cc: 999.06 },

  // ── Tabela B — SEM_CARRETA, altoDesempenho: false ─────────────────────────
  // Portaria 22/2026 inclui eixo 3. PERIGOSA_CONTEINERIZADA e PERIGOSA_GERAL
  // têm eixos 3,4,5,6,9 (sem eixo 7). GRANEL_PRESSURIZADO tem eixos 4,5,9.
  // 3 eixos
  { numeroEixos: 3, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 5.3538, cc: 533.40 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 5.3538, cc: 533.40 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 5.4189, cc: 533.40 },
  { numeroEixos: 3, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.2988, cc: 584.04 },
  { numeroEixos: 3, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 5.3538, cc: 533.40 },
  { numeroEixos: 3, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 5.3538, cc: 533.40 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.1705, cc: 689.44 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.2156, cc: 701.84 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.9361, cc: 705.04 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 5.7749, cc: 639.21 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 5.7749, cc: 639.21 },
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.0900, cc: 594.62 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.0900, cc: 594.62 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.1551, cc: 594.62 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.1428, cc: 645.26 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.0900, cc: 594.62 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.0900, cc: 594.62 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.0900, cc: 594.62 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.9067, cc: 750.65 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.9518, cc: 763.06 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.7801, cc: 766.25 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.5111, cc: 700.42 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.5111, cc: 700.42 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.7863, cc: 608.99 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.7863, cc: 608.99 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.8514, cc: 608.99 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.9617, cc: 659.62 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.7863, cc: 608.99 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.7863, cc: 608.99 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 6.7863, cc: 608.99 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.6030, cc: 765.02 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.6481, cc: 777.43 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.5990, cc: 780.62 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.2074, cc: 714.79 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.2074, cc: 714.79 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.2181, cc: 720.31 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.2181, cc: 720.31 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.2832, cc: 720.31 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.4117, cc: 775.96 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.2181, cc: 720.31 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.2181, cc: 720.31 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.0530, cc: 881.36 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.0981, cc: 893.76 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 9.0727, cc: 903.48 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.6574, cc: 831.13 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 7.6574, cc: 831.13 },
  // 7 eixos (PERIGOSA_CONTEINERIZADA e PERIGOSA_GERAL não têm eixo 7 na Tab. B; GRANEL_PRESSURIZADO também não)
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.0379, cc: 773.22 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.0379, cc: 773.22 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.1030, cc: 773.22 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 9.3892, cc: 831.06 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.0379, cc: 773.22 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.0379, cc: 773.22 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.8808, cc: 936.46 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.9259, cc: 948.87 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 10.0606, cc: 961.43 },
  // 9 eixos (PERIGOSA_CONTEINERIZADA e PERIGOSA_GERAL têm eixo 9; GRANEL_PRESSURIZADO também)
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.0379, cc: 773.22 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.4853, cc: 886.23 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, valorPorKm: 8.4853, cc: 886.23 },

  // ── Tabela C — COM_CARRETA, altoDesempenho: true ───────────────────────────
  // 2 eixos
  { numeroEixos: 2, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 3.4762, cc: 172.50 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 3.4876, cc: 174.38 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 3.5350, cc: 176.84 },
  { numeroEixos: 2, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 4.1786, cc: 205.65 },
  { numeroEixos: 2, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 3.0767, cc: 172.50 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 3.7341, cc: 212.06 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 4.0241, cc: 224.77 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 4.0551, cc: 229.89 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 4.6738, cc: 253.51 },
  // 3 eixos
  { numeroEixos: 3, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 4.4341, cc: 195.81 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 4.4476, cc: 198.05 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 4.5028, cc: 201.78 },
  { numeroEixos: 3, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.3115, cc: 232.97 },
  { numeroEixos: 3, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 4.4378, cc: 196.43 },
  { numeroEixos: 3, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 4.4335, cc: 195.72 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 4.7027, cc: 237.13 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 4.9948, cc: 250.19 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.0336, cc: 256.60 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.8205, cc: 283.12 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 4.7065, cc: 237.75 },
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.0693, cc: 213.27 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.0799, cc: 215.03 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.1771, cc: 220.31 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.0901, cc: 256.16 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.0540, cc: 210.75 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.0791, cc: 214.89 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.3761, cc: 257.89 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.6653, cc: 270.47 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.7135, cc: 278.43 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.6174, cc: 310.60 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.3608, cc: 255.37 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.8195, cc: 228.08 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.8290, cc: 229.64 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.9310, cc: 235.73 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.9516, cc: 271.54 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.8061, cc: 225.87 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.8195, cc: 228.08 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 5.9504, cc: 249.68 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.1263, cc: 272.70 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.4144, cc: 285.09 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.4674, cc: 293.85 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.4789, cc: 325.98 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.1129, cc: 270.49 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.4924, cc: 231.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.5029, cc: 232.91 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.6068, cc: 239.32 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.7470, cc: 274.63 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.4794, cc: 229.04 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.4924, cc: 231.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.6398, cc: 255.50 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.7992, cc: 275.79 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.0883, cc: 288.36 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.1433, cc: 297.43 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 8.2743, cc: 329.07 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.7862, cc: 273.66 },
  // 7 eixos
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.9018, cc: 272.80 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.8871, cc: 270.36 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.9785, cc: 274.70 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 8.2358, cc: 329.34 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.8862, cc: 270.22 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 6.9018, cc: 272.80 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.2283, cc: 320.66 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.4921, cc: 329.05 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.5346, cc: 336.06 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 8.7886, cc: 388.00 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.2127, cc: 318.08 },
  // 9 eixos
  { numeroEixos: 9, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.8926, cc: 291.39 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.8999, cc: 292.59 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.9988, cc: 298.16 },
  { numeroEixos: 9, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 9.3985, cc: 351.60 },
  { numeroEixos: 9, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.8701, cc: 287.67 },
  { numeroEixos: 9, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 7.8926, cc: 291.39 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 8.0871, cc: 323.48 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 8.2277, cc: 340.67 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 8.5135, cc: 352.70 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 8.5635, cc: 360.94 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 9.9625, cc: 412.10 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true, valorPorKm: 8.2051, cc: 336.95 },

  // ── Tabela D — SEM_CARRETA, altoDesempenho: true ───────────────────────────
  // Portaria 22/2026 inclui eixo 3. GRANEL_PRESSURIZADO tem eixos 4,5,9.
  // 3 eixos
  { numeroEixos: 3, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 4.6343, cc: 201.32 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 4.6343, cc: 201.32 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 4.6994, cc: 201.32 },
  { numeroEixos: 3, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.5936, cc: 234.06 },
  { numeroEixos: 3, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 4.6343, cc: 201.32 },
  { numeroEixos: 3, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 4.6343, cc: 201.32 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 4.9411, cc: 245.95 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.2197, cc: 256.77 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.2359, cc: 259.44 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.1208, cc: 288.50 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 4.9411, cc: 245.95 },
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.2278, cc: 214.52 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.2278, cc: 214.52 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.2929, cc: 214.52 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.2949, cc: 247.25 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.2278, cc: 214.52 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.2278, cc: 214.52 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.2278, cc: 214.52 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.5346, cc: 259.14 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.8131, cc: 269.96 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.8293, cc: 272.63 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.8222, cc: 301.69 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.5346, cc: 259.14 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.8907, cc: 217.61 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.8907, cc: 217.61 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.9558, cc: 217.61 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 7.0803, cc: 250.34 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.8907, cc: 217.61 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.8907, cc: 217.61 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 5.8907, cc: 217.61 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.1975, cc: 262.23 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.4760, cc: 273.05 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.4922, cc: 275.73 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 7.6076, cc: 304.78 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.1975, cc: 262.23 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.1067, cc: 248.80 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.1067, cc: 248.80 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.1718, cc: 248.80 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 7.3160, cc: 284.78 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.1067, cc: 248.80 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.1067, cc: 248.80 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.4332, cc: 296.67 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.7117, cc: 307.49 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.7279, cc: 310.16 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 7.8688, cc: 343.44 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.4332, cc: 296.67 },
  // 7 eixos
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.8223, cc: 263.35 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.8223, cc: 263.35 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.8874, cc: 263.35 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 8.1899, cc: 300.75 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.8223, cc: 263.35 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.8223, cc: 263.35 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GERAL,          composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 7.1574, cc: 312.64 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 7.4359, cc: 323.46 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 7.4521, cc: 326.13 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 8.7539, cc: 361.25 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 7.1574, cc: 312.64 },
  // 9 eixos (só GRANEL_PRESSURIZADO)
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true, valorPorKm: 6.8223, cc: 263.35 },
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

  // ── Trava 3: VIGENTE_DESDE deve ser posterior à versão mais recente ────────
  const maisRecente = await prisma.versaoAntt.findFirst({
    orderBy: { vigenteDesde: 'desc' },
  });

  if (maisRecente && VIGENTE_DESDE <= maisRecente.vigenteDesde) {
    throw new Error(
      `❌ VIGENTE_DESDE (${VIGENTE_DESDE.toISOString().slice(0, 10)}) não é posterior ao início da versão mais recente\n` +
      `   ${maisRecente.resolucao} (${maisRecente.vigenteDesde.toISOString().slice(0, 10)}). Confira a data no texto da resolução.`,
    );
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