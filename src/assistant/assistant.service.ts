import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AssistantService {
  private readonly log = new Logger(AssistantService.name);

  handleUserMessage(message: string): string {
    this.log.debug(`Received user message: ${message}`);
    // Aquí iría la lógica para procesar el mensaje del usuario
    return `Echo: ${message}`;
  }
}
