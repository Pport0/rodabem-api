import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ParseIntPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { DocumentoService } from './documento.service';
import { ScanDocumentoService } from './scan/scan-documento.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateDocumentoDto } from './dto/create-documento.dto';
import { UpdateDocumentoDto } from './dto/update-documento.dto';
import { Express } from 'express';

@Controller('documentos')
export class DocumentoController {
  constructor(
    private service: DocumentoService,
    private scanService: ScanDocumentoService,
  ) { }

  @UseGuards(JwtAuthGuard)
  @Post('scan')
  @UseInterceptors(FileInterceptor('documento'))
  async scan(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    return this.scanService.processarDocumento(file);
  }

  y
  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() data: CreateDocumentoDto) {
    return this.service.create(req.user.userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateDocumentoDto,
  ) {
    return this.service.update(req.user.userId, id, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.service.remove(req.user.userId, id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('alertas')
  alertasVencimento(@Req() req) {
    return this.service.alertasVencimento(req.user.userId);
  }
}