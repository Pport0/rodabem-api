import { Module } from '@nestjs/common';
import { AbastecimentoService } from './abastecimento.service';
import { AbastecimentoController } from './abastecimento.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [AbastecimentoController],
  providers: [AbastecimentoService],
  exports: [AbastecimentoService],
})
export class AbastecimentoModule {}