import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateLancamentoDto,
  TipoLancamento,
  validarCategoriaParaTipo,
} from './dto/create-lancamento.dto';
import { UpdateLancamentoDto } from './dto/update-lancamento.dto';
import { RelatorioQueryDto } from './dto/relatorio-query.dto';

@Injectable()
export class LancamentosService {
  constructor(private readonly prisma: PrismaService) {}

  private parsePeriodo(dataInicio?: string, dataFim?: string) {
    const inicio = dataInicio ? new Date(dataInicio) : undefined;
    const fim    = dataFim    ? new Date(dataFim)    : undefined;

    if (inicio && fim && fim < inicio) {
      throw new BadRequestException('dataFim não pode ser anterior a dataInicio.');
    }

    return { inicio, fim };
  }

  private whereData(inicio?: Date, fim?: Date) {
    if (!inicio && !fim) return undefined;
    return {
      ...(inicio ? { gte: inicio } : {}),
      ...(fim    ? { lte: fim    } : {}),
    };
  }

  async create(userId: number, dto: CreateLancamentoDto) {
    if (!validarCategoriaParaTipo(dto.tipo, dto.categoria)) {
      throw new BadRequestException(
        `Categoria "${dto.categoria}" não é válida para o tipo "${dto.tipo}".`,
      );
    }

    const caminhao = await this.prisma.caminhao.findUnique({ where: { userId } });
    if (!caminhao) {
      throw new BadRequestException(
        'Você precisa cadastrar um caminhão antes de registrar um lançamento.',
      );
    }

    return this.prisma.lancamento.create({
      data: {
        tipo:       dto.tipo      as any,
        categoria:  dto.categoria as any,
        valor:      dto.valor,
        descricao:  dto.descricao ?? null,
        userId,
        caminhaoId: caminhao.id,
      },
    });
  }

  async findAll(userId: number, query: RelatorioQueryDto) {
    const { inicio, fim } = this.parsePeriodo(query.dataInicio, query.dataFim);
    const dataFilter = this.whereData(inicio, fim);

    return this.prisma.lancamento.findMany({
      where: { userId, ...(dataFilter ? { data: dataFilter } : {}) },
      orderBy: { data: 'desc' },
    });
  }

  async findOne(userId: number, id: number) {
    const lancamento = await this.prisma.lancamento.findUnique({ where: { id } });
    if (!lancamento) throw new NotFoundException('Lançamento não encontrado.');
    if (lancamento.userId !== userId)
      throw new ForbiddenException('Você não tem permissão para acessar este lançamento.');
    return lancamento;
  }

  async update(userId: number, id: number, dto: UpdateLancamentoDto) {
    const lancamento = await this.findOne(userId, id);

    const novoTipo      = dto.tipo      ?? lancamento.tipo      as unknown as TipoLancamento;
    const novaCategoria = dto.categoria ?? lancamento.categoria as any;

    if (!validarCategoriaParaTipo(novoTipo, novaCategoria)) {
      throw new BadRequestException(
        `Categoria "${novaCategoria}" não é válida para o tipo "${novoTipo}".`,
      );
    }

    return this.prisma.lancamento.update({
      where: { id },
      data: {
        ...(dto.tipo      !== undefined ? { tipo:      dto.tipo      as any } : {}),
        ...(dto.categoria !== undefined ? { categoria: dto.categoria as any } : {}),
        ...(dto.valor     !== undefined ? { valor:     dto.valor             } : {}),
        ...(dto.descricao !== undefined ? { descricao: dto.descricao         } : {}),
      },
    });
  }

  async remove(userId: number, id: number) {
    await this.findOne(userId, id);
    await this.prisma.lancamento.delete({ where: { id } });
    return { message: 'Lançamento excluído com sucesso.' };
  }

  async relatorio(userId: number, query: RelatorioQueryDto) {
    const { inicio, fim } = this.parsePeriodo(query.dataInicio, query.dataFim);
    const dataFilter      = this.whereData(inicio, fim);

    const [lancamentos, abastecimentos] = await Promise.all([
      this.prisma.lancamento.findMany({
        where: { userId, ...(dataFilter ? { data: dataFilter } : {}) },
        orderBy: { data: 'asc' },
      }),
      this.prisma.abastecimento.findMany({
        where: { userId, ...(dataFilter ? { dataAbastecimento: dataFilter } : {}) },
        orderBy: { dataAbastecimento: 'asc' },
      }),
    ]);

    const totalReceitas = lancamentos
      .filter((l) => l.tipo === 'RECEITA')
      .reduce((acc, l) => acc + Number(l.valor), 0);

    const totalLancamentosDespesa = lancamentos
      .filter((l) => l.tipo === 'DESPESA')
      .reduce((acc, l) => acc + Number(l.valor), 0);

    const totalCombustivel = abastecimentos
      .reduce((acc, a) => acc + Number(a.valorTotal), 0);

    const totalDespesas = parseFloat((totalLancamentosDespesa + totalCombustivel).toFixed(2));
    const saldo = parseFloat((totalReceitas - totalDespesas).toFixed(2));

    const porCategoria: Record<string, number> = {};
    for (const l of lancamentos) {
      const cat = l.categoria as string;
      porCategoria[cat] = parseFloat(((porCategoria[cat] ?? 0) + Number(l.valor)).toFixed(2));
    }
    porCategoria['COMBUSTIVEL'] = parseFloat(totalCombustivel.toFixed(2));

    const historico = [
      ...lancamentos.map((l) => ({
        tipo: l.tipo,
        categoria: l.categoria,
        valor: Number(l.valor),
        descricao: l.descricao,
        data: l.data,
        origem: 'lancamento' as const,
        id: l.id,
      })),
      ...abastecimentos.map((a) => ({
        tipo: 'DESPESA' as const,
        categoria: 'COMBUSTIVEL' as const,
        valor: Number(a.valorTotal),
        descricao: `${a.totalLitros}L — R$ ${Number(a.precoPorLitro).toFixed(3)}/L`,
        data: a.dataAbastecimento,
        origem: 'abastecimento' as const,
        id: a.id,
      })),
    ].sort((a, b) => new Date(a.data).getTime() - new Date(b.data).getTime());

    return {
      periodo: { dataInicio: inicio ?? null, dataFim: fim ?? null },
      totalReceitas: parseFloat(totalReceitas.toFixed(2)),
      totalDespesas,
      totalCombustivel: parseFloat(totalCombustivel.toFixed(2)),
      saldo,
      porCategoria,
      historico,
    };
  }
}
