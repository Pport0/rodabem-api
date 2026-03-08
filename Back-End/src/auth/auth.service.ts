import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { decrypt } from '../common/utils/crypto.util';

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

    // 🔎 Buscar usuário
    let user;

    if (telefone) {
      user = await this.prisma.user.findFirst({
        where: { telefone },
      });
    }

    if (!user && cpf) {
      const users = await this.prisma.user.findMany();

      user = users.find((u) => {
        const decryptedCpf = decrypt(u.cpfEncrypted);
        return decryptedCpf === cpf;
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
    data: {
      token,
    },
  });

  return {
    message: 'Logout realizado com sucesso',
  };
}
}