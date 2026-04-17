import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCaminhaoDto } from './dto/create-caminhao.dto';
import { UpdateCaminhaoDto } from './dto/update-caminhao.dto';

@Injectable()
export class CaminhaoService {

  constructor(private prisma: PrismaService) {}

async create(userId: number, data: CreateCaminhaoDto){
    if (!data.placa || !data.modelo || !data.renavam) {
      throw new BadRequestException('Campos obrigatórios ausentes');
    }

    const jaPossui = await this.prisma.caminhao.findUnique({
      where: { userId }
    });

    if (jaPossui) {
      throw new BadRequestException(
        'Usuário já possui caminhão cadastrado'
      );
    }

    const caminhao = await this.prisma.caminhao.create({
      data: {
        ...data,
        userId
      }
    });

    return {
      message: 'Caminhão cadastrado com sucesso!',
      caminhao
    };
  }


 async meuCaminhao(userId: number) {

  const caminhao = await this.prisma.caminhao.findUnique({
    where: { userId }
  });

  if (!caminhao) {
    return {
      message: 'Usuário não possui caminhão cadastrado'
    };
  }

  return caminhao;
}


  async update(userId: number, data: UpdateCaminhaoDto) {

    const caminhao = await this.prisma.caminhao.findUnique({
      where: { userId }
    });

    if (!caminhao) {
      throw new BadRequestException('Caminhão não encontrado');
    }

    const updated = await this.prisma.caminhao.update({
      where: { userId },
      data
    });

    return {
      message: 'Informações alteradas com sucesso!',
      caminhao: updated
    };
  }


  async delete(userId: number) {

    const caminhao = await this.prisma.caminhao.findUnique({
      where: { userId }
    });

    if (!caminhao) {
      throw new BadRequestException('Caminhão não encontrado');
    }

    await this.prisma.caminhao.delete({
      where: { userId }
    });

    return {
      message: 'Caminhão removido com sucesso'
    };
  }

}