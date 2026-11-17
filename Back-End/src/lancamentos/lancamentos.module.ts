import { Module } from '@nestjs/common';
import { LancamentosService } from './lancamentos.service';
import { LancamentosController } from './lancamentos.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LancamentosController],
  providers: [LancamentosService],
})
export class LancamentosModule {}
