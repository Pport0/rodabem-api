import {
  Injectable,
  NestMiddleware,
  ForbiddenException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { TermosService } from '../../termos/termos.service';

const ROTAS_LIBERADAS = [
  { method: 'GET',    path: '/termos/vigente' },
  { method: 'POST',   path: '/termos/aceite' },
  { method: 'GET',    path: '/users/me' },
  { method: 'POST',   path: '/auth/logout' },
  { method: 'DELETE', path: '/users/' },
];

function isRotaLiberada(method: string, url: string): boolean {
  return ROTAS_LIBERADAS.some(
    (r) => r.method === method && url.startsWith(r.path),
  );
}

@Injectable()
export class TermoAceiteMiddleware implements NestMiddleware {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private termosService: TermosService,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    if (isRotaLiberada(req.method, req.path)) {
      return next();
    }

    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
      return next();
    }

    let userId: number;
    try {
      const token = authHeader.slice(7);
      const secret = this.configService.get<string>('JWT_SECRET')!;
      const payload = this.jwtService.verify<{ sub: number }>(token, { secret });
      userId = payload.sub;
    } catch {
      return next();
    }

    const pendente = await this.termosService.termoPendente(userId);
    if (pendente) {
      throw new ForbiddenException({
        statusCode: 403,
        code: 'TERMO_PENDENTE',
        message: 'Aceite o termo de uso vigente para continuar.',
      });
    }

    next();
  }
}
