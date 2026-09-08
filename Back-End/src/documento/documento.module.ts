import { Module } from '@nestjs/common';
import { DocumentoService } from './documento.service';
import { DocumentoController } from './documento.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScanDocumentoService } from './scan/scan-documento.service';
import { CloudinaryService } from '../caminhao/scan/cloudinary.service';
import { MulterModule } from '@nestjs/platform-express';
import { ConfigModule } from '@nestjs/config'; 

@Module({
  imports: [
    PrismaModule,
    ConfigModule, 
    MulterModule.register({
      storage: require('multer').memoryStorage(),
    }),
  ],
  controllers: [DocumentoController],
  providers: [DocumentoService, ScanDocumentoService, CloudinaryService],
})
export class DocumentoModule {}