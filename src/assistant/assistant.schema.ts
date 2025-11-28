import { ModuleMetadata, Type } from '@nestjs/common';
import z from 'zod';

export type ProviderConfig = {
  model?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
};

export type AssistantProvider = 'openai' | 'google' | 'anthropic' | 'grok';
export type AssistantModuleOptions = {
  provider: AssistantProvider;
  config: ProviderConfig;
};

export interface AssistantModuleAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  useExisting?: Type<AssistantOptionsFactory>;
  useClass?: Type<AssistantOptionsFactory>;
  useFactory?: (...args: any[]) => Promise<AssistantModuleOptions> | AssistantModuleOptions;
  inject?: any[];
  isGlobal?: boolean;
}

export interface AssistantOptionsFactory {
  createAssistantOptions(): Promise<AssistantModuleOptions> | AssistantModuleOptions;
}

export const ASSISTANT_MODULE_OPTIONS = Symbol('ASSISTANT_MODULE_OPTIONS');
export const ASSISTANT_MODEL = Symbol('ASSISTANT_MODEL');

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
  thread: z.string().default('default'),
});
export type Message = z.infer<typeof MessageSchema>;
