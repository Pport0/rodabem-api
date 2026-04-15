import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { FreteService } from './frete.service';
import { SimularFreteDto } from './dto/simular-frete.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('frete')
export class FreteController {
  constructor(private readonly freteService: FreteService) {}

  @Post('simular')
  simular(@Req() req, @Body() dto: SimularFreteDto) {
    return this.freteService.simular(req.user.userId, dto);
  }

  @Get('historico')
  historico(@Req() req) {
    return this.freteService.historico(req.user.userId);
  }

  @Get('historico/:id')
  findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.freteService.findOne(req.user.userId, id);
  }
}