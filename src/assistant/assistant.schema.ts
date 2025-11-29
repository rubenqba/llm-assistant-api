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

export const UserInputChannelSchema = z.enum(['web', 'sms', 'whatsapp']);
export type UserInputChannel = z.infer<typeof UserInputChannelSchema>;

export const InputMessageSchema = z.object({
  thread: z.string().describe('The thread ID for the conversation'),
  user: z.string().describe('The user ID sending the message'),
  content: z.string().describe('The content of the user message'),
  channel: UserInputChannelSchema.describe('The channel through which the message was sent'),
});
export type InputMessage = z.infer<typeof InputMessageSchema>;

export const MessageRoleSchema = z.enum(['user', 'assistant', 'system']);
export type MessageRole = z.infer<typeof MessageRoleSchema>;
export const MessageSchema = z.object({
  role: MessageRoleSchema,
  content: z.string(),
});
export type Message = z.infer<typeof MessageSchema>;

export const OutputResponseSchema = InputMessageSchema.omit({ content: true }).extend({
  messages: MessageSchema.array().describe('The list of messages in the conversation'),
});
export type OutputResponse = z.infer<typeof OutputResponseSchema>;

export const ThreadStateSchema = z.object({
  thread: z.string().describe('The thread ID for the conversation'),
  user: z.string().describe('The user ID associated with the thread'),
  channel: UserInputChannelSchema.describe('The channel through which the conversation is happening'),
});
export type ThreadState = z.infer<typeof ThreadStateSchema>;

// Structured output schemas for the formatter service
export const FormattedOutputSchema = z.object({
  messages: z.array(z.string()).min(1).describe('Array of formatted output messages'),
});
export type FormattedOutput = z.infer<typeof FormattedOutputSchema>;

export const SMSFormattedOutputSchema = z.object({
  messages: z
    .array(z.string().max(160, 'SMS messages must be 160 characters or less'))
    .min(1)
    .describe('Array of SMS messages, each with a maximum of 160 characters'),
});
export type SMSFormattedOutput = z.infer<typeof SMSFormattedOutputSchema>;
