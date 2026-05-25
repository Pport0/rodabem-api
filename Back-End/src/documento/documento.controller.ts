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
} from '@nestjs/common';

import {
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScanDocumentoService } from './scan/scan-documento.service';

import { DocumentoService } from './documento.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('documentos')
export class DocumentoController {

  constructor(
    private service: DocumentoService,
    private scanService: ScanDocumentoService,
  ) { }


  @UseGuards(JwtAuthGuard)
  @Post('scan')
  @UseInterceptors(FileInterceptor('documento'))
  async scan(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    return this.scanService.processarDocumento(file);
  }


  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() data) {
    return this.service.create(req.user.userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  findAll(@Req() req) {
    return this.service.findAll(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  update(@Req() req, @Param('id') id: string, @Body() data) {
    return this.service.update(req.user.userId, Number(id), data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.service.remove(req.user.userId, Number(id));
  }
}