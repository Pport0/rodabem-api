import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrsService } from './ors.service';
import { SimularFreteDto } from './dto/simular-frete.dto';
import { AbastecimentoService } from '../abastecimento/abastecimento.service';

@Injectable()
export class FreteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ors: OrsService,
    private readonly abastecimentoService: AbastecimentoService,
  ) {}

  async simular(userId: number, dto: SimularFreteDto) {
    
    const caminhao = await this.prisma.caminhao.findUnique({
      where: { userId },
    });

    if (!caminhao) {
      throw new BadRequestException(
        'Você precisa cadastrar um caminhão antes de simular um frete.',
      );
    }

    if (!caminhao.numeroEixos) {
      throw new BadRequestException(
        'Cadastre o número de eixos do seu caminhão antes de simular um frete.',
      );
    }

    
    const rota = await this.ors.calcularRota(
  dto.origem,
  dto.destino,
  dto.paradasIntermediarias,
);
    
    let consumoMedioKmL: number;

    if (dto.consumoMedioKmLOverride && dto.consumoMedioKmLOverride > 0) {
      consumoMedioKmL = dto.consumoMedioKmLOverride;
    } else {
      const mediaResult = await this.abastecimentoService.calcularMediaConsumo(userId);

      if (!mediaResult.mediaConsumo) {
        throw new BadRequestException(
          'Não há histórico de abastecimentos suficiente para calcular o consumo médio. Informe o consumo médio manualmente.',
        );
      }

      consumoMedioKmL = mediaResult.mediaConsumo;
    }

    
    const distanciaTotal = dto.retornoVazio
      ? rota.distanciaKm * 2
      : rota.distanciaKm;

    const pedagioBase = dto.pedagiosManual ?? 0;
    const pedagiosTotal = dto.retornoVazio
    ? pedagioBase * 2
    : pedagioBase;

    
    const litrosNecessarios = parseFloat(
      (distanciaTotal / consumoMedioKmL).toFixed(2),
    );
    const custoCombustivel = parseFloat(
      (litrosNecessarios * dto.precoCombustivel).toFixed(2),
    );

    
    const tabelaAntt = await this.prisma.tabelaAntt.findFirst({
      where: {
        numeroEixos: caminhao.numeroEixos,
        tipoCarga: dto.tipoCarga,
        distanciaMin: { lte: distanciaTotal },
        distanciaMax: { gte: distanciaTotal },
      },
    });

    if (!tabelaAntt) {
      throw new NotFoundException(
        `Não foram encontrados valores da ANTT para ${caminhao.numeroEixos} eixos com carga do tipo ${dto.tipoCarga}.`,
      );
    }

    const valorMinimoAntt = parseFloat(
      (tabelaAntt.valorPorKm * distanciaTotal).toFixed(2),
    );

    
    const custoTotal = custoCombustivel + pedagiosTotal;
    const valorLiquidoEstimado = parseFloat(
      (valorMinimoAntt - custoTotal).toFixed(2),
    );

    const abaixoMinimoAntt = valorLiquidoEstimado < 0;

    
    const simulacao = await this.prisma.simulacaoFrete.create({
      data: {
        origem: dto.origem,
        destino: dto.destino,
        distanciaKm: distanciaTotal,
        pedagiosEstimados: pedagiosTotal,
        consumoMedioKmL,
        precoCombustivel: dto.precoCombustivel,
        litrosNecessarios,
        custoCombustivel,
        tipoCarga: dto.tipoCarga,
        retornoVazio: dto.retornoVazio ?? false,
        altoDesempenho: dto.altoDesempenho ?? false,
        valorMinimoAntt,
        valorLiquidoEstimado,
        userId,
        caminhaoId: caminhao.id,
      },
    });

    return {
      simulacaoId: simulacao.id,
      origem: dto.origem,
      destino: dto.destino,
      distanciaKm: distanciaTotal,
      duracaoMinutos: rota.duracaoMinutos,
      pedagiosEstimados: pedagiosTotal,
      consumoMedioKmL,
      litrosNecessarios,
      custoCombustivel,
      tipoCarga: dto.tipoCarga,
      retornoVazio: dto.retornoVazio ?? false,
      altoDesempenho: dto.altoDesempenho ?? false,
      valorMinimoAntt,
      valorLiquidoEstimado,
      abaixoMinimoAntt,
      aviso: abaixoMinimoAntt
        ? 'O valor mínimo da ANTT não cobre os custos estimados desta viagem.'
        : null,
    };
  }

  
  async historico(userId: number) {
    return this.prisma.simulacaoFrete.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  
  async findOne(userId: number, id: number) {
    const simulacao = await this.prisma.simulacaoFrete.findUnique({
      where: { id },
    });

    if (!simulacao || simulacao.userId !== userId) {
      throw new NotFoundException('Simulação não encontrada.');
    }

    return simulacao;
  }
}