import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
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

  @Post('forgot-password')
  forgotPassword(@Body('email') email: string) {
    if (!email) {
      throw new BadRequestException('E-mail é obrigatório.');
    }
    return this.authService.solicitarRecuperacaoSenha(email);
  }

  @Post('reset-password')
  resetPassword(
    @Body('token') token: string,
    @Body('novaSenha') novaSenha: string,
  ) {
    if (!token || !novaSenha) {
      throw new BadRequestException('Token e nova senha são obrigatórios.');
    }
    return this.authService.concluirRecuperacaoSenha(token, novaSenha);
  }
}