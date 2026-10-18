import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import * as nodemailer from 'nodemailer';

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

  async solicitarRecuperacaoSenha(email: string) {
    
    const resposta = {
      message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.',
    };

    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return resposta;

    await this.prisma.passwordResetToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutos

    await this.prisma.passwordResetToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    await this.enviarEmailRecuperacao(email, user.nome, token);

    return resposta;
  }

  async concluirRecuperacaoSenha(token: string, novaSenha: string) {
    if (!novaSenha || novaSenha.length < 6) {
      throw new BadRequestException('A nova senha deve ter pelo menos 6 caracteres.');
    }

    const registro = await this.prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!registro || registro.usedAt || registro.expiresAt < new Date()) {
      throw new BadRequestException('Token inválido ou expirado.');
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

    await this.prisma.$transaction([
      this.prisma.passwordResetToken.update({
        where: { token },
        data: { usedAt: new Date() },
      }),
      this.prisma.user.update({
        where: { id: registro.userId },
        data: {
          senhaHash: novaSenhaHash,
          tokenVersion: { increment: 1 },
        },
      }),
    ]);

    return { message: 'Senha redefinida com sucesso. Faça login novamente.' };
  }

  private async enviarEmailRecuperacao(email: string, nome: string, token: string) {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const link = `${process.env.APP_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: `"RodaBem" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Recuperação de senha — RodaBem',
      html: `
        <p>Olá, ${nome}!</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Clique no link abaixo para criar uma nova senha. O link é válido por <strong>30 minutos</strong>.</p>
        <p><a href="${link}">${link}</a></p>
        <p>Se você não solicitou isso, ignore este e-mail.</p>
      `,
    });
  }
}