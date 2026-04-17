  import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Req,
    UseGuards,
  } from '@nestjs/common';
  import { AbastecimentoService } from './abastecimento.service';
  import { CreateAbastecimentoDto } from './dto/create-abastecimento.dto';
  import { UpdateAbastecimentoDto } from './dto/update-abastecimento.dto';
  import { JwtAuthGuard } from '../auth/jwt-auth.guard';

  @UseGuards(JwtAuthGuard)
  @Controller('abastecimentos')
  export class AbastecimentoController {
    constructor(private readonly abastecimentoService: AbastecimentoService) {}

    @Post()
  create(@Req() req, @Body() dto: CreateAbastecimentoDto) {
    return this.abastecimentoService.create(req.user.userId, dto); 
  }

  @Get()
  findAll(@Req() req) {
    return this.abastecimentoService.findAll(req.user.userId); 
  }

  @Get('media-consumo')
  mediaConsumo(@Req() req) {
    return this.abastecimentoService.calcularMediaConsumo(req.user.userId);
  }
    
    @Get(':id')
  findOne(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.abastecimentoService.findOne(req.user.userId, id); 
  }


  @Patch(':id')
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAbastecimentoDto,
  ) {
    return this.abastecimentoService.update(req.user.userId, id, dto); 
  }

  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.abastecimentoService.remove(req.user.userId, id); 
  }
  }