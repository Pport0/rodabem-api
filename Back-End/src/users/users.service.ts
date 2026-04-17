import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { encrypt, createHash } from '../common/utils/crypto.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const cpfHash = createHash(dto.cpf);

    const existing = await this.prisma.user.findUnique({ where: { cpfHash } });
    if (existing) throw new ConflictException('CPF já cadastrado');

    const emailExisting = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (emailExisting) throw new ConflictException('E-mail já cadastrado');

    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const cpfEncrypted = encrypt(dto.cpf);

    const user = await this.prisma.user.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        senhaHash,
        cpfEncrypted,
        cpfHash,
        telefone: dto.telefone,
      },
    });

    const { senhaHash: _, cpfEncrypted: __, cpfHash: ___, ...result } = user;
    return result;
  }

  async findAll(params: { page?: number; limit?: number; nome?: string; status?: string }) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (params.nome) where.nome = { contains: params.nome, mode: 'insensitive' };
    if (params.status !== undefined) where.status = params.status === 'true';

    const [users, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        skip,
        take: Number(limit),
        select: { id: true, nome: true, email: true, telefone: true, avatarUrl: true, status: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, limit };
  }

  async update(id: number, dto: Partial<{ nome: string; email: string; telefone: string; avatarUrl: string }>) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: { id: true, nome: true, email: true, telefone: true, avatarUrl: true, status: true },
    });

    return updated;
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    await this.prisma.user.delete({ where: { id } });
    return { message: 'Usuário excluído com sucesso!' };
  }
}
