import { Controller, Post, Get, Put, Delete, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { CaminhaoService } from './caminhao.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCaminhaoDto } from './dto/create-caminhao.dto';
import { UpdateCaminhaoDto } from './dto/update-caminhao.dto';
import { UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ScanService } from './scan/scan.service';


@Controller('caminhao')
export class CaminhaoController {

  constructor(
    private readonly caminhaoService: CaminhaoService,
    private readonly scanService: ScanService,
  ) { }


  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Req() req, @Body() data: CreateCaminhaoDto) {

    return this.caminhaoService.create(req.user.userId, data);
  }


  @Post('scan')
  @UseInterceptors(FileInterceptor('documento'))
  async scan(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('Nenhum arquivo enviado.');
    }
    return this.scanService.processarDocumento(file);
  }



  @UseGuards(JwtAuthGuard)
  @Get()
  meuCaminhao(@Req() req) {

    return this.caminhaoService.meuCaminhao(req.user.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Put()
  update(@Req() req, @Body() data: UpdateCaminhaoDto) {

    return this.caminhaoService.update(req.user.userId, data);
  }

  @UseGuards(JwtAuthGuard)
  @Delete()
  delete(@Req() req) {

    return this.caminhaoService.delete(req.user.userId);
  }

}