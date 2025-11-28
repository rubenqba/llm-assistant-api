import { Controller, Post, Body, Get, Param, Sse, Query } from '@nestjs/common';
import { ChatService } from './chat.service';
import { Observable, Subject } from 'rxjs';

/**
 * DTO para enviar mensajes al chat
 */
export class ChatMessageDto {
  /** El mensaje del usuario */
  message: string;

  /** ID del hilo de conversación (opcional, default: 'default') */
  threadId?: string;

  /** Prompt del sistema para personalizar el asistente (opcional) */
  systemPrompt?: string;
}

/**
 * DTO para streaming de mensajes
 */
export class ChatStreamDto {
  message: string;
  threadId?: string;
}

/**
 * Respuesta del chat
 */
export class ChatResponseDto {
  /** La respuesta del asistente */
  response: string;

  /** ID del hilo de conversación */
  threadId: string;
}

/**
 * Mensaje del historial
 */
export class HistoryMessageDto {
  role: string;
  content: string;
}

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /**
   * Endpoint para enviar un mensaje al chat
   * POST /chat
   */
  @Post()
  async chat(@Body() dto: ChatMessageDto): Promise<ChatResponseDto> {
    const threadId = dto.threadId || 'default';
    const response = await this.chatService.chat(dto.message, threadId, dto.systemPrompt);

    return {
      response,
      threadId,
    };
  }

  /**
   * Endpoint SSE para streaming de respuestas
   * GET /chat/stream?message=...&threadId=...
   */
  @Sse('stream')
  stream(@Query('message') message: string, @Query('threadId') threadId?: string): Observable<MessageEvent> {
    const subject = new Subject<MessageEvent>();

    this.chatService
      .chatStream(message, threadId || 'default', (chunk) => {
        subject.next({ data: { chunk } } as MessageEvent);
      })
      .then((fullResponse) => {
        subject.next({ data: { done: true, fullResponse } } as MessageEvent);
        subject.complete();
      })
      .catch((error) => {
        subject.error(error);
      });

    return subject.asObservable();
  }

  /**
   * Obtener el historial de un thread
   * GET /chat/history/:threadId
   */
  @Get('history/:threadId')
  async getHistory(@Param('threadId') threadId: string): Promise<HistoryMessageDto[]> {
    return this.chatService.getHistory(threadId);
  }
}
