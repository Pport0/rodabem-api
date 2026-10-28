import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  login(@Body() data: LoginDto) {
    return this.authService.login(data);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Req() req) {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      throw new BadRequestException('Token ausente no header de autorização.');
    }

    return this.authService.logout(token);
  }

  @Throttle({ default: { limit: 5, ttl: 900000 } })
  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('E-mail é obrigatório.');
    }
    return this.authService.solicitarRecuperacaoSenha(email);
  }

  
  @Post('reset-password')
  resetPassword(
    @Body('email') email: string,
    @Body('codigo') codigo: string,
    @Body('novaSenha') novaSenha: string,
  ) {
    if (!email || !codigo || !novaSenha) {
      throw new BadRequestException('E-mail, código e nova senha são obrigatórios.');
    }
    return this.authService.concluirRecuperacaoSenha(email, codigo, novaSenha);
  }
}