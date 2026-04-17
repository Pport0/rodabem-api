import { TipoCombustivel } from '@prisma/client';

export class ResponseAbastecimentoDto {
  id: number;
  precoPorLitro: number;
  totalLitros: number;
  valorTotal: number;
  quilometragem: number;
  tipoCombustivel: TipoCombustivel;
  dataAbastecimento: Date;
  latitude?: number;
  longitude?: number;
  localDescricao?: string;
  postoIdentificado?: string;
  imagemUrl?: string;
  observacao?: string;
  caminhaoId: number;
  createdAt: Date;
  updatedAt: Date;
}