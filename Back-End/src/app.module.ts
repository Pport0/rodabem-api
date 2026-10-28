import { Module, NestModule, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { CaminhaoModule } from './caminhao/caminhao.module';
import { DocumentoModule } from './documento/documento.module';
import { AbastecimentoModule } from './abastecimento/abastecimento.module';
import { FreteModule } from './frete/frete.module';
import { TermosModule } from './termos/termos.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { TermoAceiteMiddleware } from './common/middleware/termo-aceite.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 10,
    }]),
    PrismaModule,
    UsersModule,
    AuthModule,
    CaminhaoModule,
    DocumentoModule,
    AbastecimentoModule,
    FreteModule,
    TermosModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(TermoAceiteMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}