import {
  Injectable,
  BadRequestException,
  ForbiddenException,
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
      motoristaId,
    } = data;

    // campos obrigatórios
    if (!nome || !numero || !dataEmissao || !dataVencimento) {
      throw new BadRequestException('Campos obrigatórios ausentes');
    }

    // validação datas
    if (new Date(dataVencimento) < new Date(dataEmissao)) {
      throw new BadRequestException('Data de vencimento inválida');
    }

    // vínculo obrigatório (1 apenas)
    if (
      (caminhaoId && motoristaId) ||
      (!caminhaoId && !motoristaId)
    ) {
      throw new BadRequestException(
        'Deve informar apenas um vínculo (caminhão OU motorista)',
      );
    }

    const documento = await this.prisma.documento.create({
      data: {
        ...data,
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
      status: this.getStatus(doc.dataVencimento),
      diasRestantes: this.getDiasRestantes(doc.dataVencimento),
    }));
  }


  async update(userId: number, id: number, data: UpdateDocumentoDto) {
    const doc = await this.prisma.documento.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new BadRequestException('Documento não encontrado');
    }

    if (doc.userId !== userId) {
      throw new ForbiddenException('Acesso não permitido');
    }

    if (
      data.dataEmissao &&
      data.dataVencimento &&
      new Date(data.dataVencimento) < new Date(data.dataEmissao)
    ) {
      throw new BadRequestException('Data inválida');
    }

    return this.prisma.documento.update({
      where: { id },
      data,
    });
  }


  async remove(userId: number, id: number) {
    const doc = await this.prisma.documento.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new BadRequestException('Documento não encontrado');
    }

    if (doc.userId !== userId) {
      throw new ForbiddenException('Acesso não permitido');
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
    return 'VÁLIDO';
  }

  private getDiasRestantes(dataVencimento: Date) {
    const hoje = new Date();

    return Math.ceil(
      (new Date(dataVencimento).getTime() - hoje.getTime()) /
        (1000 * 60 * 60 * 24),
    );
  }
}