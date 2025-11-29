import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { createZodDto, ZodSerializerDto } from 'nestjs-zod';
import { MixologyService } from './mixology.service';
import { InputMessageSchema, MessageSchema, OutputResponse, OutputResponseSchema } from './assistant.schema';
import { FormatterService } from './formatter.service';

class MessageInputDto extends createZodDto(InputMessageSchema) {}

class MessagesResponse extends createZodDto(MessageSchema.array()) {}
class MessageResponse extends createZodDto(OutputResponseSchema) {}

@Controller('mixology')
export class MixologyController {
  constructor(
    private readonly assistant: MixologyService,
    private readonly formatter: FormatterService,
  ) {}

  @Post()
  @ZodSerializerDto(MessageResponse)
  async userMessage(@Body() input: MessageInputDto): Promise<OutputResponse> {
    // Procesar el mensaje del usuario con el asistente de mixología
    const response = await this.assistant.invoke(input);
    // Formatear la respuesta según el canal
    const formattedContent = await this.formatter.formatResponse(response.content, input.channel);
    return {
      ...input,
      messages: formattedContent.map((content) => ({ role: 'assistant', content })),
    };
  }

  @Get('messages')
  @ZodSerializerDto(MessagesResponse)
  async getMessages(@Query('thread') thread: string) {
    const messages = await this.assistant.getConversationHistory(thread);
    return messages;
  }
}
