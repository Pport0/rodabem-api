import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCaminhaoDto } from './dto/create-caminhao.dto';
import { UpdateCaminhaoDto } from './dto/update-caminhao.dto';

@Injectable()
export class CaminhaoService {
  constructor(private prisma: PrismaService) {}

  async create(userId: number, data: CreateCaminhaoDto) {
    if (!data.placa || !data.modelo || !data.renavam) {
      throw new BadRequestException('Campos obrigatórios ausentes');
    }

    const jaPossui = await this.prisma.caminhao.findUnique({
      where: { userId },
    });

    if (jaPossui) {
      throw new BadRequestException('Usuário já possui caminhão cadastrado');
    }

    const caminhao = await this.prisma.caminhao.create({
      data: {
        ...data,
        userId,
      },
    });

    return {
      message: 'Caminhão cadastrado com sucesso!',
      caminhao,
    };
  }

  async meuCaminhao(userId: number) {
    const caminhao = await this.prisma.caminhao.findUnique({
      where: { userId },
    });

    if (!caminhao) {
      return {
        message: 'Usuário não possui caminhão cadastrado',
      };
    }

    return caminhao;
  }

  async update(userId: number, data: UpdateCaminhaoDto) {
    const caminhao = await this.prisma.caminhao.findUnique({
      where: { userId },
    });

    if (!caminhao) {
      throw new BadRequestException('Caminhão não encontrado');
    }

    const updated = await this.prisma.caminhao.update({
      where: { userId },
      data,
    });

    return {
      message: 'Informações alteradas com sucesso!',
      caminhao: updated,
    };
  }

  async delete(userId: number) {
    const caminhao = await this.prisma.caminhao.findUnique({
      where: { userId },
    });

    if (!caminhao) {
      throw new BadRequestException('Caminhão não encontrado');
    }

   
    const documentos = await this.prisma.documento.count({
      where: { caminhaoId: caminhao.id },
    });

    if (documentos > 0) {
      throw new BadRequestException(
        'Não é possível excluir o caminhão pois ele possui documentos vinculados. Remova os documentos primeiro.',
      );
    }

    const abastecimentos = await this.prisma.abastecimento.count({
      where: { caminhaoId: caminhao.id },
    });

    if (abastecimentos > 0) {
      throw new BadRequestException(
        'Não é possível excluir o caminhão pois ele possui abastecimentos vinculados. Remova os abastecimentos primeiro.',
      );
    }

    const simulacoes = await this.prisma.simulacaoFrete.count({
      where: { caminhaoId: caminhao.id },
    });

    if (simulacoes > 0) {
      throw new BadRequestException(
        'Não é possível excluir o caminhão pois ele possui simulações de frete vinculadas. Remova as simulações primeiro.',
      );
    }

    await this.prisma.caminhao.delete({
      where: { userId },
    });

    return {
      message: 'Caminhão removido com sucesso',
    };
  }
}