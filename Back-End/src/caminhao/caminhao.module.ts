import { Module } from '@nestjs/common';
import { CaminhaoService } from './caminhao.service';
import { CaminhaoController } from './caminhao.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScanService } from './scan/scan.service';
import { CloudinaryService } from './scan/cloudinary.service';
import { MulterModule } from '@nestjs/platform-express';

@Module({
  imports: [
    PrismaModule,
    MulterModule.register({
      storage: require('multer').memoryStorage(),
    }),
  ],
  controllers: [CaminhaoController],
  providers: [CaminhaoService, ScanService, CloudinaryService],
})
export class CaminhaoModule {}