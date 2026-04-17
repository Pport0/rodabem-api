import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAbastecimentoDto } from './dto/create-abastecimento.dto';
import { UpdateAbastecimentoDto } from './dto/update-abastecimento.dto';

@Injectable()
export class AbastecimentoService {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------------------ //
  // CRIAR
  // ------------------------------------------------------------------ //
  async create(userId: number, dto: CreateAbastecimentoDto) {
    // 1. Verifica se o usuário possui caminhão cadastrado
    const caminhao = await this.prisma.caminhao.findUnique({
      where: { userId },
    });

    if (!caminhao) {
      throw new BadRequestException(
        'Você precisa cadastrar um caminhão antes de registrar um abastecimento.',
      );
    }

    // 2. Valida quilometragem regressiva
    await this.validarQuilometragem(caminhao.id, dto.quilometragem);

    // 3. Calcula valor total automaticamente
    const valorTotal = parseFloat(
      (dto.precoPorLitro * dto.totalLitros).toFixed(2),
    );

    // 4. Persiste o abastecimento
    const abastecimento = await this.prisma.abastecimento.create({
      data: {
        precoPorLitro: dto.precoPorLitro,
        totalLitros: dto.totalLitros,
        valorTotal,
        quilometragem: dto.quilometragem,
        tipoCombustivel: dto.tipoCombustivel,
        dataAbastecimento: new Date(),
        latitude: dto.latitude,
        longitude: dto.longitude,
        localDescricao: dto.localDescricao,
        postoIdentificado: dto.postoIdentificado,
        imagemUrl: dto.imagemUrl,
        observacao: dto.observacao,
        userId,
        caminhaoId: caminhao.id,
      },
    });

    return abastecimento;
  }


  async findAll(userId: number) {
    return this.prisma.abastecimento.findMany({
      where: { userId },
      orderBy: { dataAbastecimento: 'desc' },
      select: {
        id: true,
        dataAbastecimento: true,
        localDescricao: true,
        postoIdentificado: true,
        totalLitros: true,
        valorTotal: true,
        quilometragem: true,
        tipoCombustivel: true,
        precoPorLitro: true,
        latitude: true,
        longitude: true,
        imagemUrl: true,
        observacao: true,
        caminhaoId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

 
  async findOne(userId: number, id: number) {
    const abastecimento = await this.prisma.abastecimento.findUnique({
      where: { id },
    });

    if (!abastecimento) {
      throw new NotFoundException('Abastecimento não encontrado.');
    }

    if (abastecimento.userId !== userId) {
      throw new ForbiddenException(
        'Você não tem permissão para acessar este abastecimento.',
      );
    }

    return abastecimento;
  }

  // ------------------------------------------------------------------ //
  // EDITAR
  // ------------------------------------------------------------------ //
  async update(userId: number, id: number, dto: UpdateAbastecimentoDto) {
    const abastecimento = await this.findOne(userId, id);

    // Recalcula quilometragem se foi alterada
    if (
      dto.quilometragem !== undefined &&
      dto.quilometragem !== abastecimento.quilometragem
    ) {
      await this.validarQuilometragem(
        abastecimento.caminhaoId,
        dto.quilometragem,
        id, // ignora o próprio registro na validação
      );
    }

    // Recalcula valorTotal se preço ou litros foram alterados
    const novoPreco = dto.precoPorLitro ?? abastecimento.precoPorLitro;
    const novosLitros = dto.totalLitros ?? abastecimento.totalLitros;
    const valorTotal = parseFloat((novoPreco * novosLitros).toFixed(2));

    const atualizado = await this.prisma.abastecimento.update({
      where: { id },
      data: {
        ...(dto.precoPorLitro !== undefined && {
          precoPorLitro: dto.precoPorLitro,
        }),
        ...(dto.totalLitros !== undefined && { totalLitros: dto.totalLitros }),
        valorTotal,
        ...(dto.quilometragem !== undefined && {
          quilometragem: dto.quilometragem,
        }),
        ...(dto.tipoCombustivel !== undefined && {
          tipoCombustivel: dto.tipoCombustivel,
        }),
        ...(dto.latitude !== undefined && { latitude: dto.latitude }),
        ...(dto.longitude !== undefined && { longitude: dto.longitude }),
        ...(dto.localDescricao !== undefined && {
          localDescricao: dto.localDescricao,
        }),
        ...(dto.postoIdentificado !== undefined && {
          postoIdentificado: dto.postoIdentificado,
        }),
        ...(dto.imagemUrl !== undefined && { imagemUrl: dto.imagemUrl }),
        ...(dto.observacao !== undefined && { observacao: dto.observacao }),
      },
    });

    return atualizado;
  }

  
  async remove(userId: number, id: number) {
    await this.findOne(userId, id);

    await this.prisma.abastecimento.delete({ where: { id } });

    return { message: 'Abastecimento excluído com sucesso.' };
  }



  private async validarQuilometragem(
    caminhaoId: number,
    quilometragem: number,
    ignorarId?: number,
  ) {
    const ultimo = await this.prisma.abastecimento.findFirst({
      where: {
        caminhaoId,
        ...(ignorarId !== undefined && { id: { not: ignorarId } }),
      },
      orderBy: { quilometragem: 'desc' },
      select: { quilometragem: true },
    });

    if (ultimo && quilometragem < ultimo.quilometragem) {
      throw new BadRequestException(
        `A quilometragem informada (${quilometragem} km) não pode ser menor que a última registrada (${ultimo.quilometragem} km).`,
      );
    }
  }


async calcularMediaConsumo(userId: number) {
  const abastecimentos = await this.prisma.abastecimento.findMany({
    where: { userId },
    orderBy: { quilometragem: 'asc' },
    select: {
      quilometragem: true,
      totalLitros: true,
      dataAbastecimento: true,
    },
  });

 
  if (abastecimentos.length < 2) {
    return {
      mediaConsumo: null,
      unidade: 'km/L',
      mensagem: 'São necessários pelo menos dois abastecimentos para calcular a média de consumo.',
      totalAbastecimentos: abastecimentos.length,
    };
  }

  
  const consumos: number[] = [];

  for (let i = 1; i < abastecimentos.length; i++) {
    const atual = abastecimentos[i];
    const anterior = abastecimentos[i - 1];

    const distancia = atual.quilometragem - anterior.quilometragem;

    
    if (distancia <= 0 || atual.totalLitros <= 0) continue;

    const consumo = distancia / atual.totalLitros;
    consumos.push(consumo);
  }

  if (consumos.length === 0) {
    return {
      mediaConsumo: null,
      unidade: 'km/L',
      mensagem: 'Não foi possível calcular a média com os registros disponíveis.',
      totalAbastecimentos: abastecimentos.length,
    };
  }

  const media = consumos.reduce((acc, val) => acc + val, 0) / consumos.length;

  return {
    mediaConsumo: parseFloat(media.toFixed(2)),
    unidade: 'km/L',
    mensagem: 'Média de consumo calculada com sucesso.',
    totalAbastecimentos: abastecimentos.length,
    totalTrechosCalculados: consumos.length,
  };
}

}