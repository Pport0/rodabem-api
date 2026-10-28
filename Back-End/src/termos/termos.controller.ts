import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { TermosService } from './termos.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('termos')
export class TermosController {
  constructor(private termosService: TermosService) {}

  /** Rota pública — retorna o termo vigente. */
  @Get('vigente')
  vigente() {
    return this.termosService.vigente();
  }

  /** Rota autenticada — registra aceite do usuário autenticado. */
  @UseGuards(JwtAuthGuard)
  @Post('aceite')
  aceitar(
    @Req() req,
    @Body('termoVersao') termoVersao: string,
  ) {
    const ip = req.ip as string | undefined;
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.termosService.registrarAceite(
      req.user.userId,
      termoVersao,
      ip,
      userAgent,
    );
  }
}