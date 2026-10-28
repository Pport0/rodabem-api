import { Injectable, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { randomUUID, randomInt } from 'crypto';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { createHash } from '../common/utils/crypto.util';

const MAX_TENTATIVAS = 5;
const EXPIRACAO_MINUTOS = 30;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly transporter: Transporter;

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get<string>('SMTP_HOST'),
      port: Number(this.configService.get<string>('SMTP_PORT') ?? 587),
      secure: this.configService.get<string>('SMTP_SECURE') === 'true',
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
      connectionTimeout: 10_000,
      greetingTimeout: 5_000,
      socketTimeout: 15_000,
    });
  }

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

    if (!user) throw new UnauthorizedException('Credenciais inválidas');
    if (!user.status) throw new UnauthorizedException('Usuário inativo');

    const senhaValida = await bcrypt.compare(senha, user.senhaHash);
    if (!senhaValida) throw new UnauthorizedException('Credenciais inválidas');

    const payload = {
      sub: user.id,
      email: user.email,
      jti: randomUUID(),
      tokenVersion: user.tokenVersion,
    };

    const token = await this.jwtService.signAsync(payload);

    return {
      access_token: token,
      user: { id: user.id, nome: user.nome, email: user.email },
    };
  }

  async logout(token: string) {
    await this.prisma.tokenBlackList.create({ data: { token } });

    const setesDiasAtras = new Date();
    setesDiasAtras.setDate(setesDiasAtras.getDate() - 7);

    await this.prisma.tokenBlackList.deleteMany({
      where: { createdAt: { lt: setesDiasAtras } },
    });

    return { message: 'Logout realizado com sucesso' };
  }

  async solicitarRecuperacaoSenha(email: string) {
    const resposta = {
      message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.',
    };

    const emailNormalizado = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: emailNormalizado } });
    if (!user) return resposta;

    const codigo = String(randomInt(0, 100_000_000)).padStart(8, '0');
    const codigoHash = await bcrypt.hash(codigo, 10);
    const expiresAt = new Date(Date.now() + EXPIRACAO_MINUTOS * 60 * 1000);

    
    await this.prisma.passwordResetToken.upsert({
      where: { userId: user.id },
      create: { userId: user.id, codigoHash, expiresAt },
      update: { codigoHash, expiresAt, tentativas: 0 },
    });

    setImmediate(() => {
      this.enviarEmailRecuperacao(emailNormalizado, user.nome, codigo).catch((err) => {
        this.logger.error(
          `Falha ao enviar e-mail de recuperação para ${emailNormalizado}: ${err?.message ?? err}`,
        );
      });
    });

    return resposta;
  }

  async concluirRecuperacaoSenha(email: string, codigo: string, novaSenha: string) {
    if (!novaSenha || novaSenha.length < 6) {
      throw new BadRequestException('A nova senha deve ter pelo menos 6 caracteres.');
    }

    const ERRO_GENERICO = 'Código inválido ou expirado.';
    const emailNormalizado = email.toLowerCase().trim();

    const user = await this.prisma.user.findUnique({ where: { email: emailNormalizado } });
    if (!user) throw new BadRequestException(ERRO_GENERICO);

    const registro = await this.prisma.passwordResetToken.findFirst({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    if (!registro || registro.expiresAt < new Date()) {
      if (registro) {
        await this.prisma.passwordResetToken.delete({ where: { id: registro.id } });
      }
      throw new BadRequestException(ERRO_GENERICO);
    }

    if (registro.tentativas >= MAX_TENTATIVAS) {
      await this.prisma.passwordResetToken.delete({ where: { id: registro.id } });
      throw new BadRequestException(ERRO_GENERICO);
    }

    const codigoValido = await bcrypt.compare(codigo, registro.codigoHash);

    if (!codigoValido) {
      const atualizado = await this.prisma.passwordResetToken.updateMany({
        where: { id: registro.id, tentativas: registro.tentativas },
        data: { tentativas: { increment: 1 } },
      });

      if (atualizado.count === 0) {
        throw new BadRequestException(ERRO_GENERICO);
      }

      const novasTentativas = registro.tentativas + 1;
      if (novasTentativas >= MAX_TENTATIVAS) {
        await this.prisma.passwordResetToken.delete({ where: { id: registro.id } });
      }

      throw new BadRequestException(ERRO_GENERICO);
    }

    const novaSenhaHash = await bcrypt.hash(novaSenha, 10);

    const resultado = await this.prisma.$transaction(async (tx) => {
      const deletado = await tx.passwordResetToken.deleteMany({
        where: { id: registro.id },
      });

      if (deletado.count === 0) {
        return null;
      }

      await tx.user.update({
        where: { id: user.id },
        data: { senhaHash: novaSenhaHash, tokenVersion: { increment: 1 } },
      });

      return true;
    });

    if (!resultado) {
      throw new BadRequestException(ERRO_GENERICO);
    }

    return { message: 'Senha redefinida com sucesso. Faça login novamente.' };
  }

  private async enviarEmailRecuperacao(email: string, nome: string, codigo: string) {
    await this.transporter.sendMail({
      from: `"RodaBem" <${this.configService.get<string>('SMTP_USER')}>`,
      to: email,
      subject: 'Recuperação de senha — RodaBem',
      html: `
        <p>Olá, ${nome}!</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Use o código abaixo no aplicativo. Ele é válido por <strong>${EXPIRACAO_MINUTOS} minutos</strong>.</p>
        <h2 style="letter-spacing: 4px; font-size: 32px;">${codigo}</h2>
        <p>Se você não solicitou isso, ignore este e-mail. Sua senha não será alterada.</p>
      `,
    });
  }
}