import { Body, Controller, Get, Header, Post, Query } from '@nestjs/common';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import z from 'zod';
import { MixologyService } from './mixology.service';
import { MessageSchema } from './assistant.schema';

class MessageInputDto extends createZodDto(
  z.object({
    content: z.string(),
    thread: z.string().default('default'),
  }),
) {}

class MessagesResponse extends createZodDto(MessageSchema.array()) {}

@Controller('mixology')
export class MixologyController {
  constructor(private readonly assistant: MixologyService) {}

  @Post()
  @Header('Content-Type', 'text/html')
  async userMessage(@Body() message: MessageInputDto) {
    const response = await this.assistant.invoke({
      role: 'user',
      content: message.content,
      thread: message.thread,
    });
    return `<html>${response.content}</html>`;
  }

  @Get('messages')
  @ZodSerializerDto(MessagesResponse)
  async getMessages(@Query('thread') thread: string) {
    const messages = await this.assistant.getConversationHistory(thread);
    return messages;
  }
}
