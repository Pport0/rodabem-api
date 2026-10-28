import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ParseIntPipe,
  Req,
  ForbiddenException,
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateUserDto } from './dto/update-user.dto';
import { TermosService } from '../termos/termos.service';

@Controller('users')
export class UsersController {
  constructor(
    private usersService: UsersService,
    private termosService: TermosService,
  ) {}

  @Post()
  create(@Req() req, @Body() dto: CreateUserDto) {
    const ip = req.ip as string | undefined;
    const userAgent = req.headers['user-agent'] as string | undefined;
    return this.usersService.create(dto, ip, userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req) {
    const [user, pendente] = await Promise.all([
      this.usersService.findById(req.user.userId),
      this.termosService.termoPendente(req.user.userId),
    ]);
    return { ...user, termoPendente: pendente };
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateUserDto,
  ) {
    if (req.user.userId !== id) {
      throw new ForbiddenException('Você não tem permissão para editar este usuário.');
    }
    return this.usersService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    if (req.user.userId !== id) {
      throw new ForbiddenException('Você não tem permissão para excluir este usuário.');
    }
    return this.usersService.remove(id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me/senha')
  alterarSenha(
    @Req() req,
    @Body() dto: { senhaAtual: string; novaSenha: string },
  ) {
    return this.usersService.alterarSenha(req.user.userId, dto);
  }
}