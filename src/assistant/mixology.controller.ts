import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { MixologyService } from './mixology.service';
import { InputMessageSchema, MessageSchema } from './assistant.schema';

class MessageInputDto extends createZodDto(InputMessageSchema) {}

class MessagesResponse extends createZodDto(MessageSchema.array()) {}
class MessageResponse extends createZodDto(MessageSchema) {}

@Controller('mixology')
export class MixologyController {
  constructor(private readonly assistant: MixologyService) {}

  @Post()
  @ZodSerializerDto(MessageResponse)
  async userMessage(@Body() message: MessageInputDto) {
    const response = await this.assistant.invoke(message);
    return response;
  }

  @Get('messages')
  @ZodSerializerDto(MessagesResponse)
  async getMessages(@Query('thread') thread: string) {
    const messages = await this.assistant.getConversationHistory(thread);
    return messages;
  }
}
