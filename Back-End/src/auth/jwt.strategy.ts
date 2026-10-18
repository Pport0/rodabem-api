import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new UnauthorizedException('Token ausente');
    }

    const isBlacklisted = await this.prisma.tokenBlackList.findFirst({
      where: { token },
    });

    if (isBlacklisted) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { tokenVersion: true },
    });

    if (!user || payload.tokenVersion !== user.tokenVersion) {
      throw new UnauthorizedException('Sessão encerrada. Faça login novamente.');
    }

    return {
      userId: payload.sub,
      email: payload.email,
    };
  }
}