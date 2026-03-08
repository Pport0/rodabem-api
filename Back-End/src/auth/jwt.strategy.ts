import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET as string,
      passReqToCallback: true,
    } as any); // força a tipagem correta
  }

async validate(req: Request, payload: any) {

  const token = req.headers.authorization?.replace('Bearer ', '');

  const blacklisted = await this.prisma.tokenBlackList.findFirst({
    where: { token },
  });

  if (blacklisted) {
    throw new UnauthorizedException('Token revogado');
  }

  return {
    userId: payload.sub,
    email: payload.email,
  };
}
}