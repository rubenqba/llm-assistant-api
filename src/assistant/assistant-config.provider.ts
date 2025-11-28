import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AssistantModuleOptions, AssistantOptionsFactory, AssistantProvider } from './assistant.schema';

@Injectable()
export class AssistantConfigProvider implements AssistantOptionsFactory {
  private readonly log = new Logger(AssistantConfigProvider.name);

  constructor(private readonly config: ConfigService) {}

  createAssistantOptions(): AssistantModuleOptions {
    this.log.debug('Fetching AssistantModule configuration');
    const provider = this.config.get<AssistantProvider>('MIXOLOGY_PROVIDER', 'openai');
    const apiKeyMap: Record<string, string> = {
      openai: 'OPENAI_API_KEY',
      google: 'GOOGLE_API_KEY',
      anthropic: 'ANTHROPIC_API_KEY',
      grok: 'GROK_API_KEY',
    };
    const apiKey = this.config.get<string>(apiKeyMap[provider]);
    const model = this.config.get<string>('MIXOLOGY_MODEL');
    this.log.debug(`Configuring AssistantModule with provider: ${provider}:${model} and apiKey: ${apiKey ?? 'not set'}`);
    return {
      provider,
      config: {
        apiKey,
        model,
      },
    };
  }
}
