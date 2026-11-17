import {
  Body, Controller, Delete, Get, Param,
  ParseIntPipe, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LancamentosService } from './lancamentos.service';
import { CreateLancamentoDto } from './dto/create-lancamento.dto';
import { UpdateLancamentoDto } from './dto/update-lancamento.dto';
import { RelatorioQueryDto } from './dto/relatorio-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('lancamentos')
export class LancamentosController {
  constructor(private readonly lancamentosService: LancamentosService) {}

  @Post()
  create(@Req() req, @Body() dto: CreateLancamentoDto) {
    return this.lancamentosService.create(req.user.userId, dto);
  }

  @Get('relatorio')
  relatorio(@Req() req, @Query() query: RelatorioQueryDto) {
    return this.lancamentosService.relatorio(req.user.userId, query);
  }

  @Get()
  findAll(@Req() req, @Query() query: RelatorioQueryDto) {
    return this.lancamentosService.findAll(req.user.userId, query);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.lancamentosService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateLancamentoDto) {
    return this.lancamentosService.update(req.user.userId, id, dto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.lancamentosService.remove(req.user.userId, id);
  }
}
