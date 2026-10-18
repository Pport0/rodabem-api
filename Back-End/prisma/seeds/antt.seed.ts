import { PrismaClient, TipoCarga, ComposicaoVeicular } from '@prisma/client';

const prisma = new PrismaClient();

type CoefBase = {
  numeroEixos: number;
  tipoCarga: TipoCarga;
  valorPorKm: number;
  cc: number;
};

// TABELA A — COM_CARRETA, altoDesempenho: false
const tabelaA: CoefBase[] = [
  // 2 eixos
  { numeroEixos: 2, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 3.6815, cc: 436.39 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 3.7123, cc: 444.84 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 3.7837, cc: 455.84 },
  { numeroEixos: 2, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 4.3423, cc: 502.29 },
  { numeroEixos: 2, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 3.3488, cc: 436.39 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 4.0432, cc: 531.01 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 4.4560, cc: 587.98 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 4.5395, cc: 610.96 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 4.9296, cc: 609.31 },
  // 3 eixos
  { numeroEixos: 3, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 4.7062, cc: 523.33 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 4.7427, cc: 533.36 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 4.8350, cc: 550.10 },
  { numeroEixos: 3, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 5.5387, cc: 601.96 },
  { numeroEixos: 3, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 4.7164, cc: 526.13 },
  { numeroEixos: 3, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 4.7048, cc: 522.93 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 5.0774, cc: 620.58 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 5.4960, cc: 679.12 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 5.6004, cc: 707.85 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 6.1385, cc: 712.41 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 5.0876, cc: 623.38 },
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 5.3386, cc: 568.72 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 5.3672, cc: 576.59 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 5.5162, cc: 600.27 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 6.3226, cc: 663.16 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 5.2975, cc: 557.42 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 5.3649, cc: 575.96 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 5.7453, cc: 670.91 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 6.1560, cc: 727.28 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 6.2857, cc: 762.95 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 6.9381, cc: 780.02 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 5.7042, cc: 659.60 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 6.1604, cc: 635.08 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 6.1859, cc: 642.10 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 6.3480, cc: 669.38 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 7.2435, cc: 732.07 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 6.1243, cc: 625.16 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 6.1604, cc: 635.08 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 6.5125, cc: 731.90 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 6.5671, cc: 737.27 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 6.9747, cc: 792.80 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 7.1175, cc: 832.06 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 7.8590, cc: 848.93 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 6.5311, cc: 727.35 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 6.7774, cc: 648.95 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 6.8058, cc: 656.76 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 6.9730, cc: 685.45 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 7.9625, cc: 745.94 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 6.7426, cc: 639.38 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 6.7774, cc: 648.95 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 7.1739, cc: 757.99 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 7.1841, cc: 751.14 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 7.5946, cc: 807.45 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 7.7425, cc: 848.13 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 8.5780, cc: 862.80 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 7.1493, cc: 741.56 },
  // 7 eixos
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 7.4902, cc: 803.22 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 7.4505, cc: 792.30 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 7.5842, cc: 811.76 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 8.8534, cc: 949.16 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 7.4482, cc: 791.67 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 7.4902, cc: 803.22 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 7.9146, cc: 910.26 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 8.2569, cc: 947.84 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 8.3713, cc: 979.29 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 9.4918, cc: 1072.32 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 7.8726, cc: 898.70 },
  // 9 eixos
  { numeroEixos: 9, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 8.5104, cc: 872.44 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 8.5300, cc: 877.83 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 8.6837, cc: 902.80 },
  { numeroEixos: 9, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 10.0426, cc: 1030.58 },
  { numeroEixos: 9, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 8.4497, cc: 855.76 },
  { numeroEixos: 9, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 8.5104, cc: 872.44 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 9.0335, cc: 1016.29 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 8.9424, cc: 981.58 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 9.3441, cc: 1035.49 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 9.4785, cc: 1072.44 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 10.6910, cc: 1156.49 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 8.8818, cc: 964.90 },
];

// TABELA B — SEM_CARRETA, altoDesempenho: false (só 4+ eixos)
const tabelaB: CoefBase[] = [
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 4.7937, cc: 515.17 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 4.7937, cc: 515.17 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 4.8566, cc: 515.17 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 5.6121, cc: 564.07 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 4.7937, cc: 515.17 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 4.7937, cc: 515.17 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 5.2004, cc: 617.35 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 5.5825, cc: 665.87 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 5.6260, cc: 677.85 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 6.2276, cc: 680.93 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 5.2004, cc: 617.35 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 5.4473, cc: 574.29 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 5.4473, cc: 574.29 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 5.5102, cc: 574.29 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 6.3555, cc: 623.20 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 5.4473, cc: 574.29 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 5.4473, cc: 574.29 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 5.4473, cc: 574.29 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 5.8540, cc: 676.48 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 6.2360, cc: 724.99 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 6.2796, cc: 736.97 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 6.9710, cc: 740.05 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 5.8540, cc: 676.48 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 6.0546, cc: 588.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 6.0546, cc: 588.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 6.1175, cc: 588.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 7.0649, cc: 637.07 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 6.0546, cc: 588.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 6.0546, cc: 588.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 6.0546, cc: 588.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 6.4613, cc: 690.35 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 6.8434, cc: 738.86 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 6.8870, cc: 750.84 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 7.6804, cc: 753.93 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 6.4613, cc: 690.35 },
  // 7 eixos
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 6.4716, cc: 695.68 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 6.4716, cc: 695.68 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 6.5345, cc: 695.68 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 7.4995, cc: 749.43 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 6.4716, cc: 695.68 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 6.4716, cc: 695.68 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 6.8960, cc: 802.71 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 7.2780, cc: 851.22 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 7.3216, cc: 863.20 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 8.1380, cc: 872.59 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 6.8960, cc: 802.71 },
  // 9 eixos
  { numeroEixos: 9, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 7.1838, cc: 746.78 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 7.1838, cc: 746.78 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 7.2467, cc: 746.78 },
  { numeroEixos: 9, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 8.3441, cc: 802.65 },
  { numeroEixos: 9, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 7.1838, cc: 746.78 },
  { numeroEixos: 9, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 7.1838, cc: 746.78 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 7.1838, cc: 746.78 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 7.6158, cc: 855.93 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 7.9979, cc: 904.44 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 8.0415, cc: 916.42 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 8.9925, cc: 928.56 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 7.6158, cc: 855.93 },
];

// TABELA C — COM_CARRETA, altoDesempenho: true
const tabelaC: CoefBase[] = [
  // 2 eixos
  { numeroEixos: 2, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 3.1044, cc: 166.60 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 3.1154, cc: 168.42 },
  { numeroEixos: 2, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 3.1612, cc: 170.79 },
  { numeroEixos: 2, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 3.7196, cc: 198.62 },
  { numeroEixos: 2, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 2.7717, cc: 166.60 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 3.3535, cc: 204.81 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 3.6335, cc: 217.08 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 3.6635, cc: 222.03 },
  { numeroEixos: 2, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 4.1978, cc: 244.84 },
  // 3 eixos
  { numeroEixos: 3, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 3.9493, cc: 189.11 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 3.9624, cc: 191.28 },
  { numeroEixos: 3, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 4.0158, cc: 194.88 },
  { numeroEixos: 3, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 4.7135, cc: 225.01 },
  { numeroEixos: 3, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 3.9530, cc: 189.72 },
  { numeroEixos: 3, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 3.9488, cc: 189.03 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 4.2088, cc: 229.02 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 4.4909, cc: 241.63 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 4.5284, cc: 247.82 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 5.2051, cc: 273.44 },
  { numeroEixos: 3, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 4.2124, cc: 229.62 },
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 4.5189, cc: 205.98 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 4.5292, cc: 207.68 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 4.6230, cc: 212.78 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 5.4105, cc: 247.41 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 4.5041, cc: 203.55 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 4.5283, cc: 207.54 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 4.8152, cc: 249.08 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 5.0945, cc: 261.22 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 5.1411, cc: 268.91 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 5.9198, cc: 299.98 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 4.8005, cc: 246.64 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 5.1860, cc: 220.28 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 5.1952, cc: 221.79 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 5.2937, cc: 227.67 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 6.1709, cc: 262.25 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 5.1731, cc: 218.14 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 5.1860, cc: 220.28 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 5.3125, cc: 241.14 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 5.4824, cc: 263.37 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 5.7605, cc: 275.34 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 5.8118, cc: 283.80 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 6.6801, cc: 314.83 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 5.4694, cc: 261.24 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 5.7707, cc: 223.27 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 5.7809, cc: 224.95 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 5.8813, cc: 231.13 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 6.8575, cc: 265.24 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 5.7582, cc: 221.21 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 5.7707, cc: 223.27 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 5.9131, cc: 246.76 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 6.0670, cc: 266.36 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 6.3462, cc: 278.50 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 6.3993, cc: 287.26 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 7.3668, cc: 317.82 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 6.0545, cc: 264.30 },
  // 7 eixos
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 6.1662, cc: 263.47 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 6.1520, cc: 261.12 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 6.2403, cc: 265.31 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 7.3296, cc: 318.08 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 6.1511, cc: 260.98 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 6.1662, cc: 263.47 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 6.4815, cc: 309.70 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 6.7363, cc: 317.80 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 6.7773, cc: 324.57 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 7.8636, cc: 374.73 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 6.4664, cc: 307.21 },
  // 9 eixos
  { numeroEixos: 9, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 7.0435, cc: 281.43 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 7.0505, cc: 282.59 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 7.1460, cc: 287.97 },
  { numeroEixos: 9, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 8.3531, cc: 339.58 },
  { numeroEixos: 9, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 7.0217, cc: 277.83 },
  { numeroEixos: 9, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 7.0435, cc: 281.43 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 7.2313, cc: 312.42 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 7.3671, cc: 329.02 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 7.6431, cc: 340.64 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 7.6914, cc: 348.60 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 8.8978, cc: 398.01 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 7.3453, cc: 325.43 },
];

// TABELA D — SEM_CARRETA, altoDesempenho: true (só 4+ eixos)
const tabelaD: CoefBase[] = [
  // 4 eixos
  { numeroEixos: 4, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 4.0988, cc: 194.44 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 4.0988, cc: 194.44 },
  { numeroEixos: 4, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 4.1617, cc: 194.44 },
  { numeroEixos: 4, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 4.9309, cc: 226.06 },
  { numeroEixos: 4, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 4.0988, cc: 194.44 },
  { numeroEixos: 4, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 4.0988, cc: 194.44 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 4.3951, cc: 237.54 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 4.6641, cc: 247.99 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 4.6797, cc: 250.57 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 5.4402, cc: 278.63 },
  { numeroEixos: 4, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 4.3951, cc: 237.54 },
  // 5 eixos
  { numeroEixos: 5, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 4.6146, cc: 207.18 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 4.6146, cc: 207.18 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 4.6775, cc: 207.18 },
  { numeroEixos: 5, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 5.5366, cc: 238.80 },
  { numeroEixos: 5, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 4.6146, cc: 207.18 },
  { numeroEixos: 5, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 4.6146, cc: 207.18 },
  { numeroEixos: 5, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 4.6146, cc: 207.18 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 4.9109, cc: 250.28 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 5.1799, cc: 260.73 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 5.1955, cc: 263.31 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 6.0458, cc: 291.37 },
  { numeroEixos: 5, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 4.9109, cc: 250.28 },
  // 6 eixos
  { numeroEixos: 6, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 5.1896, cc: 210.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 5.1896, cc: 210.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 5.2525, cc: 210.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 6.2136, cc: 241.78 },
  { numeroEixos: 6, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 5.1896, cc: 210.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 5.1896, cc: 210.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 5.1896, cc: 210.17 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 5.4859, cc: 253.27 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 5.7549, cc: 263.72 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 5.7706, cc: 266.30 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 6.7229, cc: 294.36 },
  { numeroEixos: 6, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 5.4859, cc: 253.27 },
  // 7 eixos
  { numeroEixos: 7, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 5.3982, cc: 240.30 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 5.3982, cc: 240.30 },
  { numeroEixos: 7, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 5.4611, cc: 240.30 },
  { numeroEixos: 7, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 6.4413, cc: 275.04 },
  { numeroEixos: 7, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 5.3982, cc: 240.30 },
  { numeroEixos: 7, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 5.3982, cc: 240.30 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 5.7136, cc: 286.53 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 5.9826, cc: 296.98 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 5.9982, cc: 299.56 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 6.9752, cc: 331.70 },
  { numeroEixos: 7, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 5.7136, cc: 286.53 },
  // 9 eixos
  { numeroEixos: 9, tipoCarga: TipoCarga.GERAL,                   valorPorKm: 6.0097, cc: 254.35 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_SOLIDO,           valorPorKm: 6.0097, cc: 254.35 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_LIQUIDO,          valorPorKm: 6.0726, cc: 254.35 },
  { numeroEixos: 9, tipoCarga: TipoCarga.FRIGORIFICADA,           valorPorKm: 7.1858, cc: 290.47 },
  { numeroEixos: 9, tipoCarga: TipoCarga.CONTEINER,               valorPorKm: 6.0097, cc: 254.35 },
  { numeroEixos: 9, tipoCarga: TipoCarga.NEOGRANEL,               valorPorKm: 6.0097, cc: 254.35 },
  { numeroEixos: 9, tipoCarga: TipoCarga.GRANEL_PRESSURIZADO,     valorPorKm: 6.0097, cc: 254.35 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GERAL,          valorPorKm: 6.3333, cc: 301.95 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_SOLIDO,  valorPorKm: 6.6023, cc: 312.40 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_GRANEL_LIQUIDO, valorPorKm: 6.6180, cc: 314.98 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_FRIGORIFICADA,  valorPorKm: 7.7305, cc: 348.90 },
  { numeroEixos: 9, tipoCarga: TipoCarga.PERIGOSA_CONTEINERIZADA, valorPorKm: 6.3333, cc: 301.95 },
];

const coeficientes = [
  ...tabelaA.map(c => ({ ...c, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: false, distanciaMin: 0, distanciaMax: 99999 })),
  ...tabelaB.map(c => ({ ...c, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: false, distanciaMin: 0, distanciaMax: 99999 })),
  ...tabelaC.map(c => ({ ...c, composicaoVeicular: ComposicaoVeicular.COM_CARRETA, altoDesempenho: true,  distanciaMin: 0, distanciaMax: 99999 })),
  ...tabelaD.map(c => ({ ...c, composicaoVeicular: ComposicaoVeicular.SEM_CARRETA, altoDesempenho: true,  distanciaMin: 0, distanciaMax: 99999 })),
];

export async function seedAntt() {
  console.log('🌱 Iniciando seed da Tabela ANTT (Res. 6.076/2026)...');

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

  const deletados = await prisma.tabelaAntt.deleteMany({
    where: { versaoId: versao.id },
  });
  console.log(`🗑️  ${deletados.count} registros antigos removidos.`);

  await prisma.tabelaAntt.createMany({
    data: coeficientes.map(item => ({ ...item, versaoId: versao!.id })),
  });

  console.log(`✅ ${coeficientes.length} registros inseridos (4 tabelas: A, B, C, D).`);
}