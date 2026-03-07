import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { decrypt } from '../common/utils/crypto.util';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(data: LoginDto) {
    if (!data.cpf && !data.telefone) {
      throw new UnauthorizedException(
        'Informe CPF ou telefone',
      );
    }

     let user: User | null = null;


    if (data.telefone) {
      user = await this.prisma.user.findFirst({
        where: {
          telefone: data.telefone,
          status: true,
        },
      });
    }

    if (!user && data.cpf) {
      const users = await this.prisma.user.findMany({
        where: {
          status: true,
        },
      });

      for (const u of users) {
        const cpfDescriptografado = decrypt(u.cpfEncrypted);

        if (cpfDescriptografado === data.cpf) {
          user = u;
          break;
        }
      }
    }

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const senhaValida = await bcrypt.compare(
      data.senha,
      user.senhaHash,
    );

    if (!senhaValida) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = {
      sub: user.id,
    };

    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
      },
    };
  }



}