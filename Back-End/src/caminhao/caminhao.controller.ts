import { Controller, Post, Get, Put, Delete, Body, UseGuards, Req } from '@nestjs/common';
import { CaminhaoService } from './caminhao.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCaminhaoDto } from './dto/create-caminhao.dto'; 
import { UpdateCaminhaoDto } from './dto/update-caminhao.dto';

@Controller('caminhao')
export class CaminhaoController {

  constructor(private caminhaoService: CaminhaoService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() data:CreateCaminhaoDto) {

    return this.caminhaoService.create(req.user.userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  meuCaminhao(@Req() req) {

    return this.caminhaoService.meuCaminhao(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  update(@Req() req, @Body() data:UpdateCaminhaoDto) {

    return this.caminhaoService.update(req.user.userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  delete(@Req() req) {

    return this.caminhaoService.delete(req.user.userId);
  }

}