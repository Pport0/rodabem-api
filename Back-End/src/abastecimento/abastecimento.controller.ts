import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AbastecimentoService } from './abastecimento.service';
import { CreateAbastecimentoDto } from './dto/create-abastecimento.dto';
import { UpdateAbastecimentoDto } from './dto/update-abastecimento.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { HodometroScanService } from './scan/hodometro-scan.service';
import { PostosProximosService } from './postos/postos-proximos.service';
import { PostosProximosQueryDto } from './dto/postos-proximos-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('abastecimentos')
export class AbastecimentoController {
  constructor(
    private readonly abastecimentoService: AbastecimentoService,
    private readonly hodometroScanService: HodometroScanService,
    private readonly postosProximosService: PostosProximosService,
  ) {}

  @Post()
  create(@Req() req, @Body() dto: CreateAbastecimentoDto) {
    return this.abastecimentoService.create(req.user.userId, dto);
  }

  @Post('scan')
  @UseInterceptors(FileInterceptor('imagem'))
  async scan(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Nenhuma imagem enviada.');
    }
    return this.hodometroScanService.processarHodometro(file);
  }

  @Get()
  findAll(@Req() req) {
    return this.abastecimentoService.findAll(req.user.userId);
  }

  @Get('media-consumo')
  mediaConsumo(@Req() req) {
    return this.abastecimentoService.calcularMediaConsumo(req.user.userId);
  }

  @Get('relatorio')
  relatorio(
    @Req() req,
    @Query('dataInicio') dataInicio: string,
    @Query('dataFim') dataFim: string,
  ) {
    return this.abastecimentoService.relatorio(req.user.userId, dataInicio, dataFim);
  }

  // Antes de ':id', senao o ParseIntPipe captura "postos-proximos" como id.
  @Get('postos-proximos')
  postosProximos(@Query() query: PostosProximosQueryDto) {
    return this.postosProximosService.buscar(query.latitude, query.longitude);
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