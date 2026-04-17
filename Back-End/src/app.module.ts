import { Module } from '@nestjs/common';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { CaminhaoModule } from './caminhao/caminhao.module';
import { DocumentoModule } from './documento/documento.module';
import { AbastecimentoModule } from './abastecimento/abastecimento.module';
import {FreteModule} from './frete/frete.module'


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    UsersModule,
    AuthModule,
    CaminhaoModule,
    DocumentoModule,
    AbastecimentoModule,
    FreteModule,
    
  ],
})
export class AppModule {}