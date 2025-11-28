import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ZodExceptionFilter } from './filters/zod-exception.filter';
import { CocktailDBModule } from './cocktaildb/cocktaildb.module';
import { AssistantModule } from './assistant/assistant.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AssistantModuleOptions, AssistantProvider } from './assistant/assistant.schema';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    CocktailDBModule,
    // Ejemplo de configuración asíncrona con useFactory
    AssistantModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService): AssistantModuleOptions => {
        const provider = configService.get<AssistantProvider>('MIXOLOGY_PROVIDER', 'openai');
        const apiKeyMap: Record<string, string> = {
          openai: 'OPENAI_API_KEY',
          google: 'GOOGLE_API_KEY',
          anthropic: 'ANTHROPIC_API_KEY',
          grok: 'GROK_API_KEY',
        };
        const apiKey = configService.get<string>(apiKeyMap[provider]);
        return {
          provider,
          config: {
            apiKey,
          },
        };
      },
      inject: [ConfigService],
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
