import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ZodExceptionFilter } from './filters/zod-exception.filter';
import { CocktailDBModule } from './cocktaildb/cocktaildb.module';
import { AssistantModule } from './assistant/assistant.module';
import { ConfigModule } from '@nestjs/config';
import { AssistantConfigProvider } from './assistant/assistant-config.provider';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CocktailDBModule,
    // Configuración asíncrona usando useClass
    AssistantModule.forRootAsync({
      useClass: AssistantConfigProvider,
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_PIPE,
      useClass: ZodValidationPipe,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ZodSerializerInterceptor,
    },
    {
      provide: APP_FILTER,
      useClass: ZodExceptionFilter,
    },
  ],
})
export class AppModule {}
