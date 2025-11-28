import { DynamicModule, Logger, Module, Provider } from '@nestjs/common';
import { AssistantService } from './assistant.service';
import { MixologyService } from './mixology.service';
import { ChatService } from './chat.service';
import { ChatController } from './chat.controller';
import { CocktailDBModule } from 'src/cocktaildb/cocktaildb.module';
import { MixologyController } from './mixology.controller';
import {
  ASSISTANT_MODEL,
  ASSISTANT_MODULE_OPTIONS,
  AssistantModuleAsyncOptions,
  AssistantModuleOptions,
  AssistantOptionsFactory,
} from './assistant.schema';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { ChatAnthropic } from '@langchain/anthropic';
import { ChatXAI } from '@langchain/xai';
import { ConfigService } from '@nestjs/config';
import { LanguageModelLike } from '@langchain/core/language_models/base';
import { AssistantConfigProvider } from './assistant-config.provider';

const DEFAULT_MODULE_OPTIONS: AssistantModuleOptions = Object.freeze({
  provider: 'openai',
  config: {
    model: 'gpt-5-mini',
  },
});

function createAssistantModelProvider(): Provider {
  return {
    provide: ASSISTANT_MODEL,
    useFactory: (options: AssistantModuleOptions): LanguageModelLike => {
      const log = new Logger('AssistantModule');
      switch (options.provider) {
        case 'openai': {
          log.debug(`OpenAI provider selected with model: ${options.config.model}`);
          return new ChatOpenAI({
            model: options.config.model || 'gpt-5-mini',
            apiKey: options.config.apiKey,
            temperature: options.config.temperature,
            maxTokens: options.config.maxTokens,
            timeout: options.config.timeout,
          });
        }
        case 'google': {
          log.debug(`Google provider selected with model: ${options.config.model}`);
          return new ChatGoogleGenerativeAI({
            model: options.config.model || 'gemini-3-pro-preview',
            apiKey: options.config.apiKey,
            temperature: options.config.temperature,
            maxOutputTokens: options.config.maxTokens,
            thinkingConfig: {
              thinkingLevel: 'LOW',
            },
          });
        }
        case 'anthropic': {
          log.debug(`Anthropic provider selected with model: ${options.config.model}`);
          return new ChatAnthropic({
            model: options.config.model || 'claude-sonnet-4-5',
            apiKey: options.config.apiKey,
            temperature: options.config.temperature,
            maxTokens: options.config.maxTokens,
          });
        }
        case 'grok': {
          log.debug(`Grok provider selected with model: ${options.config.model}`);
          return new ChatXAI({
            model: options.config.model || 'grok-4-1-fast-reasoning',
            apiKey: options.config.apiKey,
            temperature: options.config.temperature,
            maxTokens: options.config.maxTokens,
          });
        }
        default:
          throw new Error(`Unsupported assistant provider: ${options.provider as string}`);
      }
    },
    inject: [ASSISTANT_MODULE_OPTIONS, ConfigService],
  };
}

function createAsyncOptionsProvider(options: AssistantModuleAsyncOptions): Provider {
  if (options.useFactory) {
    return {
      provide: ASSISTANT_MODULE_OPTIONS,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };
  }

  const inject = options.useExisting || options.useClass;
  if (!inject) {
    throw new Error('Invalid AssistantModuleAsyncOptions: must provide useFactory, useClass, or useExisting');
  }

  return {
    provide: ASSISTANT_MODULE_OPTIONS,
    useFactory: async (optionsFactory: AssistantOptionsFactory): Promise<AssistantModuleOptions> => {
      return optionsFactory.createAssistantOptions();
    },
    inject: [inject],
  };
}

@Module({})
export class AssistantModule {
  /**
   * Configura el módulo de forma síncrona con opciones estáticas
   */
  static forRoot(options: AssistantModuleOptions = DEFAULT_MODULE_OPTIONS): DynamicModule {
    const optionsProvider: Provider = {
      provide: ASSISTANT_MODULE_OPTIONS,
      useValue: options,
    };

    return {
      module: AssistantModule,
      imports: [CocktailDBModule],
      controllers: [ChatController, MixologyController],
      providers: [AssistantConfigProvider, optionsProvider, createAssistantModelProvider(), AssistantService, MixologyService, ChatService],
      exports: [AssistantConfigProvider, ChatService, ASSISTANT_MODULE_OPTIONS, ASSISTANT_MODEL],
    };
  }

  /**
   * Configura el módulo de forma asíncrona usando un factory, clase o proveedor existente
   */
  static forRootAsync(options: AssistantModuleAsyncOptions): DynamicModule {
    const asyncProviders = this.createAsyncProviders(options);

    return {
      module: AssistantModule,
      imports: [...(options.imports || []), CocktailDBModule],
      controllers: [ChatController, MixologyController],
      providers: [...asyncProviders, createAssistantModelProvider(), AssistantService, MixologyService, ChatService],
      exports: [ChatService, ASSISTANT_MODULE_OPTIONS, ASSISTANT_MODEL],
      global: options.isGlobal,
    };
  }

  private static createAsyncProviders(options: AssistantModuleAsyncOptions): Provider[] {
    if (options.useExisting || options.useFactory) {
      return [createAsyncOptionsProvider(options)];
    }

    if (options.useClass) {
      return [
        createAsyncOptionsProvider(options),
        {
          provide: options.useClass,
          useClass: options.useClass,
        },
      ];
    }

    throw new Error('Invalid AssistantModuleAsyncOptions: must provide useFactory, useClass, or useExisting');
  }
}
