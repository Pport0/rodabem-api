import { Module } from '@nestjs/common';
import { CaminhaoController } from './caminhao.controller';
import { CaminhaoService } from './caminhao.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CaminhaoController],
  providers: [CaminhaoService],
})
export class CaminhaoModule {}