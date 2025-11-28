import { Body, Controller, Header, Post } from '@nestjs/common';
import { createZodDto } from 'nestjs-zod';
import z from 'zod';
import { MixologyService } from './mixology.service';

class MessageInputDto extends createZodDto(
  z.object({
    content: z.string(),
    thread: z.string().default('default'),
  }),
) {}

class MessageResponseDto extends createZodDto(
  z.object({
    content: z.string(),
    thread: z.string(),
  }),
) {}

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
}
