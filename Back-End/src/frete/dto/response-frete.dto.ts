import { TipoCarga } from '@prisma/client';

export class ResponseFreteDto {
  origem: string;
  destino: string;
  distanciaKm: number;
  pedagiosEstimados: number;
  consumoMedioKmL: number;
  precoCombustivel: number;
  litrosNecessarios: number;
  custoCombustivel: number;
  tipoCarga: TipoCarga;
  retornoVazio: boolean;
  altoDesempenho: boolean;
  valorMinimoAntt: number;
  valorLiquidoEstimado: number;
  abaixoMinimoAntt: boolean;
}