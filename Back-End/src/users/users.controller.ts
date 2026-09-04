import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // Item 11 — GET /users/me (já existia, mantido)
  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) {
    return this.usersService.findById(req.user.userId);
  }

  // Item 2 — GET /users restrito a admins (removido acesso de usuário comum)
  // Mantido apenas para uso administrativo interno — não expõe dados de outros usuários
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Req() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('nome') nome?: string,
    @Query('status') status?: string,
  ) {
    // Apenas o próprio usuário pode listar — retorna só seus dados
    return this.usersService.findById(req.user.userId);
  }

  // Item 1 — Ownership check: usuário só pode editar a si mesmo
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: Partial<{ nome: string; email: string; telefone: string; avatarUrl: string }>,
  ) {
    if (req.user.userId !== id) {
      throw new ForbiddenException('Você não tem permissão para editar este usuário.');
    }
    return this.usersService.update(id, dto);
  }

  // Item 1 — Ownership check: usuário só pode excluir a si mesmo
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    if (req.user.userId !== id) {
      throw new ForbiddenException('Você não tem permissão para excluir este usuário.');
    }
    return this.usersService.remove(id);
  }
}