import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ComposicaoVeicular } from '@prisma/client';
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
  ) { }

  /**
   * Busca o coeficiente ANTT para o número de eixos informado.
   * Quando não há linha exata, aplica o Art. 5º § 5º da Res. 6.076/2026:
   * usa o eixo imediatamente inferior disponível; sem inferior, o superior.
   */
  private async buscarCoeficienteAntt(params: {
    versaoId: number;
    numeroEixos: number;
    tipoCarga: string;
    altoDesempenho: boolean;
    composicaoVeicular: ComposicaoVeicular;
    distanciaKm: number;
  }) {
    const base = {
      versaoId: params.versaoId,
      tipoCarga: params.tipoCarga as any,
      altoDesempenho: params.altoDesempenho,
      composicaoVeicular: params.composicaoVeicular,
      distanciaMin: { lte: params.distanciaKm },
      distanciaMax: { gte: params.distanciaKm },
    };

    // 1. Busca exata
    const exato = await this.prisma.tabelaAntt.findFirst({
      where: { ...base, numeroEixos: params.numeroEixos },
    });
    if (exato) return { coeficiente: exato, eixosUsados: params.numeroEixos };

    // 2. Eixo imediatamente inferior (maior valor <= numeroEixos - 1)
    const inferior = await this.prisma.tabelaAntt.findFirst({
      where: { ...base, numeroEixos: { lt: params.numeroEixos } },
      orderBy: { numeroEixos: 'desc' },
    });
    if (inferior) return { coeficiente: inferior, eixosUsados: inferior.numeroEixos };

    // 3. Eixo imediatamente superior (menor valor >= numeroEixos + 1)
    const superior = await this.prisma.tabelaAntt.findFirst({
      where: { ...base, numeroEixos: { gt: params.numeroEixos } },
      orderBy: { numeroEixos: 'asc' },
    });
    if (superior) return { coeficiente: superior, eixosUsados: superior.numeroEixos };

    return null;
  }

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

    if (dto.percentualLucroDesejado !== undefined && dto.percentualLucroDesejado < 0) {
      throw new BadRequestException('Percentual de lucro não pode ser negativo.');
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

    const distanciaIda = rota.distanciaKm;

    const pedagioBase = dto.pedagiosManual ?? 0;
    const pedagiosTotal = dto.retornoVazio ? pedagioBase * 2 : pedagioBase;

    const agora = new Date();
    const versaoAtual = await this.prisma.versaoAntt.findFirst({
      where: {
        vigenteDesde: { lte: agora },
        OR: [
          { vigenteAte: null },
          { vigenteAte: { gte: agora } },
        ],
      },
      orderBy: { vigenteDesde: 'desc' },
      select: { id: true, resolucao: true, vigenteDesde: true },
    });

    if (!versaoAtual) {
      throw new NotFoundException('Nenhuma tabela ANTT vigente encontrada.');
    }

    const resultado = await this.buscarCoeficienteAntt({
      versaoId: versaoAtual.id,
      numeroEixos: caminhao.numeroEixos,
      tipoCarga: dto.tipoCarga,
      altoDesempenho: dto.altoDesempenho ?? false,
      composicaoVeicular: dto.composicaoVeicular ?? ComposicaoVeicular.COM_CARRETA,
      distanciaKm: distanciaIda,
    });

    if (!resultado) {
      throw new NotFoundException(
        `Não foram encontrados valores da ANTT para ${caminhao.numeroEixos} eixos com carga do tipo ${dto.tipoCarga}.`,
      );
    }

    const { coeficiente: tabelaAntt, eixosUsados } = resultado;
    const eixosFallback = eixosUsados !== caminhao.numeroEixos;

    const ccd = tabelaAntt.valorPorKm;
    const cc = tabelaAntt.cc ?? 0;

    const pisoIda = distanciaIda * ccd + cc;
    const pisoRetorno = dto.retornoVazio
      ? distanciaIda * ccd * 0.92
      : 0;

    const valorMinimoAntt = parseFloat((pisoIda + pisoRetorno).toFixed(2));

    const distanciaTotal = dto.retornoVazio
      ? distanciaIda * 2
      : distanciaIda;

    const litrosNecessarios = parseFloat(
      (distanciaTotal / consumoMedioKmL).toFixed(2),
    );
    const custoCombustivel = parseFloat(
      (litrosNecessarios * dto.precoCombustivel).toFixed(2),
    );

    const valorLiquidoEstimado = parseFloat(
      (valorMinimoAntt - custoCombustivel).toFixed(2),
    );

    const abaixoMinimoAntt = valorLiquidoEstimado < 0;

    const custoTotal = parseFloat((custoCombustivel + pedagiosTotal).toFixed(2));
    let valorSugerido: number | null = null;
    let sugeridoAbaixoDoMinimo = false;

    if (dto.percentualLucroDesejado !== undefined) {
      valorSugerido = parseFloat(
        (custoTotal * (1 + dto.percentualLucroDesejado / 100)).toFixed(2),
      );
      sugeridoAbaixoDoMinimo = valorSugerido < valorMinimoAntt;
    }

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
        percentualLucroDesejado: dto.percentualLucroDesejado ?? null,
        valorSugerido,
        userId,
        caminhaoId: caminhao.id,
        versaoAnttId: versaoAtual.id,
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
      custoTotal,
      tipoCarga: dto.tipoCarga,
      retornoVazio: dto.retornoVazio ?? false,
      altoDesempenho: dto.altoDesempenho ?? false,
      valorMinimoAntt,
      valorLiquidoEstimado,
      abaixoMinimoAntt,
      percentualLucroDesejado: dto.percentualLucroDesejado ?? null,
      valorSugerido,
      sugeridoAbaixoDoMinimo: valorSugerido !== null ? sugeridoAbaixoDoMinimo : null,
      tabelaAnttReferencia: {
        resolucao: versaoAtual.resolucao,
        vigenteDesde: versaoAtual.vigenteDesde,
      },
      aviso: (() => {
        if (eixosFallback)
          return `Coeficiente calculado com base em ${eixosUsados} eixos (Art. 5º § 5º ${versaoAtual.resolucao}) — tabela ANTT não prevê ${caminhao.numeroEixos} eixos para este tipo de carga.`;
        if (abaixoMinimoAntt) return 'O valor mínimo da ANTT não cobre os custos estimados desta viagem.';
        if (sugeridoAbaixoDoMinimo) return 'O valor sugerido está abaixo do piso mínimo da ANTT.';
        return null;
      })(),
    };
  }

  async historico(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [simulacoes, total] = await Promise.all([
      this.prisma.simulacaoFrete.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.simulacaoFrete.count({ where: { userId } }),
    ]);

    return {
      data: simulacoes,
      total,
      page,
      limit,
      totalPaginas: Math.ceil(total / limit),
    };
  }

  async findOne(userId: number, id: number) {
    const simulacao = await this.prisma.simulacaoFrete.findUnique({
      where: { id },
    });

    if (!simulacao) {
      throw new NotFoundException('Simulação não encontrada.');
    }

    if (simulacao.userId !== userId) {
      throw new ForbiddenException('Você não tem permissão para acessar esta simulação.');
    }

    return simulacao;
  }
}