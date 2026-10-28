import { Module } from '@nestjs/common';
import { TermosService } from './termos.service';
import { TermosController } from './termos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TermosController],
  providers: [TermosService],
  exports: [TermosService],
})
export class TermosModule {}