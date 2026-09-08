import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';

@Injectable()
export class DocumentoService {

  private readonly diasAlerta: number;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.diasAlerta = this.configService.get<number>('DIAS_ALERTA_VENCIMENTO') ?? 30;
  }

  async create(userId: number, data: CreateDocumentoDto) {
    const {
      nome,
      numero,
      dataEmissao,
      dataVencimento,
      caminhaoId,
      observacao,
      arquivoUrl,
    } = data;

    if (!nome || !numero || !dataEmissao || !dataVencimento) {
      throw new BadRequestException('Campos obrigatorios ausentes');
    }

    if (new Date(dataVencimento) < new Date(dataEmissao)) {
      throw new BadRequestException('Data de vencimento invalida');
    }

    if (caminhaoId) {
      const caminhao = await this.prisma.caminhao.findUnique({
        where: { id: caminhaoId },
      });

      if (!caminhao || caminhao.userId !== userId) {
        throw new ForbiddenException(
          'Voce nao pode vincular documento a este caminhao.',
        );
      }
    }

    const documento = await this.prisma.documento.create({
      data: {
        nome,
        numero,
        dataEmissao: new Date(dataEmissao),
        dataVencimento: new Date(dataVencimento),
        observacao,
        arquivoUrl,
        caminhaoId: caminhaoId ?? null,
        userId,
      },
    });

    return {
      message: 'Documento cadastrado com sucesso',
      documento,
    };
  }

  async findAll(userId: number) {
    const documentos = await this.prisma.documento.findMany({
      where: { userId },
    });

    return documentos.map((doc) => ({
      ...doc,
      vinculo: doc.caminhaoId ? 'CAMINHAO' : 'MOTORISTA',
      status: this.getStatus(doc.dataVencimento),
      diasRestantes: this.getDiasRestantes(doc.dataVencimento),
    }));
  }

  async update(userId: number, id: number, data: UpdateDocumentoDto) {
    const doc = await this.prisma.documento.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new BadRequestException('Documento nao encontrado');
    }

    if (doc.userId !== userId) {
      throw new ForbiddenException('Acesso nao permitido');
    }

    if (
      data.dataEmissao &&
      data.dataVencimento &&
      new Date(data.dataVencimento) < new Date(data.dataEmissao)
    ) {
      throw new BadRequestException('Data invalida');
    }

    return this.prisma.documento.update({
      where: { id },
      data: {
        ...data,
        dataEmissao: data.dataEmissao ? new Date(data.dataEmissao) : undefined,
        dataVencimento: data.dataVencimento ? new Date(data.dataVencimento) : undefined,
      },
    });
  }

  async remove(userId: number, id: number) {
    const doc = await this.prisma.documento.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new BadRequestException('Documento nao encontrado');
    }

    if (doc.userId !== userId) {
      throw new ForbiddenException('Acesso nao permitido');
    }

    await this.prisma.documento.delete({
      where: { id },
    });

    return {
      message: 'Documento removido com sucesso',
    };
  }

  async alertasVencimento(userId: number) {
  const diasAlerta = this.diasAlerta;
  const hoje = new Date();
  const limite = new Date(hoje.getTime() + diasAlerta * 24 * 60 * 60 * 1000);

  const documentos = await this.prisma.documento.findMany({
    where: {
      userId,
      dataVencimento: {
        lte: limite,
        gte: hoje, 
      },
    },
    orderBy: { dataVencimento: 'asc' },
    select: {
      id: true,
      nome: true,
      numero: true,
      dataVencimento: true,
      caminhaoId: true,
    },
  });

  if (documentos.length === 0) {
    return {
      alertas: [],
      mensagem: 'Nenhum documento a vencer.',
    };
  }

  return {
    alertas: documentos.map((doc) => ({
      ...doc,
      vinculo: doc.caminhaoId ? 'CAMINHAO' : 'MOTORISTA',
      diasRestantes: this.getDiasRestantes(doc.dataVencimento),
    })),
    mensagem: `${documentos.length} documento(s) vencendo nos próximos ${diasAlerta} dias.`,
  };
}

  private getStatus(dataVencimento: Date) {
    const hoje = new Date();
    const diff =
      (new Date(dataVencimento).getTime() - hoje.getTime()) /
      (1000 * 60 * 60 * 24);

    if (diff < 0) return 'EXPIRADO';
    if (diff <= this.diasAlerta) return 'VENCENDO';
    return 'VALIDO';
  }

  private getDiasRestantes(dataVencimento: Date) {
    const hoje = new Date();
    return Math.ceil(
      (new Date(dataVencimento).getTime() - hoje.getTime()) /
        (1000 * 60 * 60 * 24),
    );
  }
}