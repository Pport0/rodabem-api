import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { encrypt } from '../common/utils/crypto.util';
import { isValidCPF } from './validators/cpf.validator';
import { UpdateUserDto } from './dto/update-user.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    if (!isValidCPF(data.cpf)) {
      throw new BadRequestException('CPF inválido');
    }

    const senhaHash = await bcrypt.hash(data.senha, 10);
    const cpfHash = await bcrypt.hash(data.cpf, 10);
    const cpfEncrypted = encrypt(data.cpf);

    return this.prisma.user.create({
      data: {
        nome: data.nome,
        email: data.email,
        senhaHash: senhaHash,
        cpfHash: cpfHash,
        cpfEncrypted: cpfEncrypted,
        telefone: data.telefone,
      },
    });
  }

  async findAll(
  page: number,
  limit: number,
  nome?: string,
  status?: string,
) {
  const where: any = {};

  if (nome) {
    where.nome = {
      contains: nome,
      mode: 'insensitive',
    };
  }

  if (status !== undefined) {
    where.status = status === 'true';
  }

  const users = await this.prisma.user.findMany({
    where,
    skip: (page - 1) * limit,
    take: limit,
    orderBy: {
      nome: 'asc',
    },
  });

  return users.map(({ senhaHash, cpfHash, cpfEncrypted, ...user }) => user);
}


async update(id: number, data: UpdateUserDto) {

  const user = await this.prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new BadRequestException('Usuário não encontrado');
  }

  const updated = await this.prisma.user.update({
    where: { id },
    data: {
      ...(data.nome && { nome: data.nome }),
      ...(data.email && { email: data.email }),
      ...(data.telefone && { telefone: data.telefone }),
      ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
    },
  });

  const { senhaHash, cpfHash, cpfEncrypted, ...safe } = updated;

  return safe;
}



async remove(id: number) {

  const user = await this.prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new BadRequestException('Usuário não encontrado');
  }

  // Simulação de vínculo ativo
  const possuiVinculo = false;

  if (possuiVinculo) {
    throw new BadRequestException(
      'Usuário possui vínculos ativos',
    );
  }

  await this.prisma.user.delete({
    where: { id },
  });

  return {
    message: 'Usuário excluído com sucesso!',
  };
}
}