import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { encrypt } from '../common/utils/crypto.util';
import { isValidCPF } from './validators/cpf.validator';
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
}