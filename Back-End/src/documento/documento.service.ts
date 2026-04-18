import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';

@Injectable()
export class DocumentoService {
  constructor(private prisma: PrismaService) {}

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
        dataEmissao: data.dataEmissao
          ? new Date(data.dataEmissao)
          : undefined,
        dataVencimento: data.dataVencimento
          ? new Date(data.dataVencimento)
          : undefined,
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

  private getStatus(dataVencimento: Date) {
    const hoje = new Date();
    const diasConfig = 30;

    const diff =
      (new Date(dataVencimento).getTime() - hoje.getTime()) /
      (1000 * 60 * 60 * 24);

    if (diff < 0) return 'EXPIRADO';
    if (diff <= diasConfig) return 'VENCENDO';
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
