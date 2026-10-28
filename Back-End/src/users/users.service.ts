import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { createHash } from '../common/utils/crypto.util';
import { isValidCPF } from './validators/cpf.validator';
import { CryptoService } from '../crypto/crypto.service';
import { TermosService } from '../termos/termos.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private cryptoService: CryptoService,
    private termosService: TermosService,
  ) {}

  async create(dto: CreateUserDto & { termoVersao: string }, ip?: string, userAgent?: string) {
    if (!isValidCPF(dto.cpf)) {
      throw new BadRequestException('CPF inválido.');
    }

    const cpfHash = createHash(dto.cpf);
    const emailNormalizado = dto.email.toLowerCase().trim();

    const [existing, emailExisting] = await Promise.all([
      this.prisma.user.findUnique({ where: { cpfHash } }),
      this.prisma.user.findUnique({ where: { email: emailNormalizado } }),
    ]);

    if (existing) throw new ConflictException('CPF já cadastrado');
    if (emailExisting) throw new ConflictException('E-mail já cadastrado');

    if (dto.telefone) {
      const telefoneExisting = await this.prisma.user.findUnique({
        where: { telefone: dto.telefone },
      });
      if (telefoneExisting) throw new ConflictException('Telefone já cadastrado');
    }

    const vigente = await this.termosService.vigente();
    if (vigente.versao !== dto.termoVersao) {
      throw new BadRequestException(
        `Aceite a versão vigente do termo: "${vigente.versao}".`,
      );
    }

    const senhaHash = await bcrypt.hash(dto.senha, 10);
    const cpfEncrypted = this.cryptoService.encrypt(dto.cpf);

    const user = await this.prisma.$transaction(async (tx) => {
      const novoUser = await tx.user.create({
        data: {
          nome: dto.nome,
          email: emailNormalizado,
          senhaHash,
          cpfEncrypted,
          cpfHash,
          telefone: dto.telefone,
        },
      });

      await tx.aceiteTermo.create({
        data: {
          userId: novoUser.id,
          termoId: vigente.id,
          ip,
          userAgent,
        },
      });

      return novoUser;
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
        cpfEncrypted: true,
      },
    });

    if (!user) {
      throw new BadRequestException('Usuário não encontrado');
    }

    const { cpfEncrypted, ...resto } = user;
    const cpf = cpfEncrypted ? this.cryptoService.decrypt(cpfEncrypted) : null;

    return { ...resto, cpf };
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

    const emailNormalizado = dto.email ? dto.email.toLowerCase().trim() : undefined;

    if (emailNormalizado && emailNormalizado !== user.email) {
      const emailExisting = await this.prisma.user.findUnique({
        where: { email: emailNormalizado },
      });
      if (emailExisting && emailExisting.id !== id) {
        throw new ConflictException('E-mail já cadastrado');
      }
    }

    if (dto.telefone && dto.telefone !== user.telefone) {
      const telefoneExisting = await this.prisma.user.findUnique({
        where: { telefone: dto.telefone },
      });
      if (telefoneExisting && telefoneExisting.id !== id) {
        throw new ConflictException('Telefone já cadastrado');
      }
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { ...dto, ...(emailNormalizado ? { email: emailNormalizado } : {}) },
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

  async alterarSenha(id: number, dto: { senhaAtual: string; novaSenha: string }) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('Usuário não encontrado');

    const senhaValida = await bcrypt.compare(dto.senhaAtual, user.senhaHash);
    if (!senhaValida) {
      throw new BadRequestException('Senha atual incorreta.');
    }

    if (dto.novaSenha.length < 6) {
      throw new BadRequestException('A nova senha deve ter pelo menos 6 caracteres.');
    }

    const novaSenhaHash = await bcrypt.hash(dto.novaSenha, 10);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.deleteMany({ where: { userId: id } }),
      this.prisma.user.update({
        where: { id },
        data: { senhaHash: novaSenhaHash, tokenVersion: { increment: 1 } },
      }),
    ]);

    return { message: 'Senha alterada com sucesso.' };
  }
}