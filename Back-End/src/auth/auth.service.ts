import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { createHash } from '../common/utils/crypto.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(data: LoginDto) {
    const { cpf, telefone, senha } = data;

    if (!cpf && !telefone) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    let user;

    if (telefone) {
      user = await this.prisma.user.findFirst({
        where: { telefone },
      });
    }

    if (!user && cpf) {
      const cpfHash = createHash(cpf);
      user = await this.prisma.user.findUnique({
        where: { cpfHash },
      });
    }

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!user.status) {
      throw new UnauthorizedException('Usuário inativo');
    }

    const senhaValida = await bcrypt.compare(senha, user.senhaHash);

    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      jti: randomUUID(),
      tokenVersion: user.tokenVersion,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
      },
    };
  }

  async logout(token: string) {
    await this.prisma.tokenBlackList.create({
      data: { token },
    });

    const setesDiasAtras = new Date();
    setesDiasAtras.setDate(setesDiasAtras.getDate() - 7);

    await this.prisma.tokenBlackList.deleteMany({
      where: {
        createdAt: { lt: setesDiasAtras },
      },
    });

    return {
      message: 'Logout realizado com sucesso',
    };
  }
}