import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { encrypt, createHash } from '../common/utils/crypto.util';

// Item 4 — validação real de CPF
function isValidCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  if (/^(\d)\1+$/.test(cleaned)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned[10])) return false;

  return true;
}

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    // Item 4 — valida CPF antes de prosseguir
    if (!isValidCPF(dto.cpf)) {
      throw new BadRequestException('CPF inválido.');
    }

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

  async findById(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    return user;
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
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          avatarUrl: true,
          status: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.user.count({ where }),
    ]);

    return { data: users, total, page, limit };
  }

  async update(
    id: number,
    dto: Partial<{ nome: string; email: string; telefone: string; avatarUrl: string }>,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const updated = await this.prisma.user.update({
      where: { id },
      data: dto,
      select: {
        id: true,
        nome: true,
        email: true,
        telefone: true,
        avatarUrl: true,
        status: true,
      },
    });

    return updated;
  }

  async remove(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    // Item 5 — verifica vínculos antes de excluir
    const caminhao = await this.prisma.caminhao.findUnique({ where: { userId: id } });
    if (caminhao) {
      throw new BadRequestException(
        'Não é possível excluir o usuário pois ele possui um caminhão cadastrado. Remova o caminhão primeiro.',
      );
    }

    const documentos = await this.prisma.documento.count({ where: { userId: id } });
    if (documentos > 0) {
      throw new BadRequestException(
        'Não é possível excluir o usuário pois ele possui documentos cadastrados. Remova os documentos primeiro.',
      );
    }

    const abastecimentos = await this.prisma.abastecimento.count({ where: { userId: id } });
    if (abastecimentos > 0) {
      throw new BadRequestException(
        'Não é possível excluir o usuário pois ele possui abastecimentos cadastrados. Remova os abastecimentos primeiro.',
      );
    }

    await this.prisma.user.delete({ where: { id } });
    return { message: 'Usuário excluído com sucesso!' };
  }
}