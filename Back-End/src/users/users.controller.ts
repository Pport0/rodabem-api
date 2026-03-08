import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Put,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';

import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // rota pública
  @Post()
  create(@Body() data: CreateUserDto) {
    return this.usersService.create(data);
  }

  // rota protegida
  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @Query('nome') nome?: string,
    @Query('status') status?: string,
  ) {
    return this.usersService.findAll(
      Number(page),
      Number(limit),
      nome,
      status,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
update(
  @Param('id') id: string,
  @Body() data: UpdateUserDto,
) {
  return this.usersService.update(Number(id), data);
}

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(Number(id));
  }
}