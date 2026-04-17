import { Module } from '@nestjs/common';
import { FreteService } from './frete.service';
import { FreteController } from './frete.controller';
import { OrsService } from './ors.service'
import { PrismaModule } from '../prisma/prisma.module';
import { AbastecimentoModule } from '../abastecimento/abastecimento.module';

@Module({
  imports: [PrismaModule, AbastecimentoModule],
  controllers: [FreteController],
  providers: [FreteService, OrsService],
})
export class FreteModule {}