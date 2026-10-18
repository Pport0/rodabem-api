import { Module } from '@nestjs/common';
import { AbastecimentoService } from './abastecimento.service';
import { AbastecimentoController } from './abastecimento.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HodometroScanService } from './scan/hodometro-scan.service';

@Module({
  imports: [PrismaModule],
  controllers: [AbastecimentoController],
  providers: [AbastecimentoService, HodometroScanService],
  exports: [AbastecimentoService],
})
export class AbastecimentoModule {}