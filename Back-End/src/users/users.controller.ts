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
  Patch,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) { }

  @Post()
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@Req() req) {
    return this.usersService.findById(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Req() req,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('nome') nome?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findById(req.user.userId);
  }

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