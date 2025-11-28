import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ChatOpenAI } from '@langchain/openai';
import { BaseMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { MemorySaver } from '@langchain/langgraph';
import { StateGraph, START, END, MessagesAnnotation } from '@langchain/langgraph';

/**
 * Servicio de chat usando LangChain con memoria de conversación
 *
 * Este servicio implementa un asistente conversacional con:
 * - Modelo de lenguaje OpenAI (GPT-4o-mini por defecto)
 * - Memoria de conversación usando MemorySaver
 * - Soporte para múltiples hilos de conversación (threads)
 */
@Injectable()
export class ChatService implements OnModuleInit {
  private readonly log = new Logger(ChatService.name);
  private model!: ChatOpenAI;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private app: any; // Compiled StateGraph
  private checkpointer!: MemorySaver;

  onModuleInit() {
    this.initializeChat();
  }

  private initializeChat() {
    // Inicializar el modelo de OpenAI
    this.model = new ChatOpenAI({
      model: 'gpt-4o-mini', // Puedes cambiar a 'gpt-4o' para mejor calidad
      temperature: 0.7,
      // La API key se toma automáticamente de OPENAI_API_KEY env var
    });

    // Crear el checkpointer para memoria de conversación
    this.checkpointer = new MemorySaver();

    // Definir la función del nodo de chat
    const callModel = async (state: typeof MessagesAnnotation.State) => {
      const response = await this.model.invoke(state.messages);
      return { messages: [response] };
    };

    // Crear el grafo de estados
    const workflow = new StateGraph(MessagesAnnotation).addNode('chat', callModel).addEdge(START, 'chat').addEdge('chat', END);

    // Compilar el grafo con el checkpointer
    this.app = workflow.compile({ checkpointer: this.checkpointer });

    this.log.log('Chat service initialized successfully');
  }

  /**
   * Envía un mensaje al chat y obtiene una respuesta
   * @param message - El mensaje del usuario
   * @param threadId - ID del hilo de conversación (para mantener contexto)
   * @param systemPrompt - Prompt del sistema opcional para personalizar el asistente
   * @returns La respuesta del asistente
   */
  async chat(message: string, threadId = 'default', systemPrompt?: string): Promise<string> {
    this.log.debug(`Processing message for thread ${threadId}: ${message}`);

    const config = {
      configurable: { thread_id: threadId },
    };

    // Preparar mensajes
    const messages: BaseMessage[] = [];

    // Agregar system prompt si es la primera interacción o si se proporciona uno
    if (systemPrompt) {
      messages.push(new SystemMessage(systemPrompt));
    }

    messages.push(new HumanMessage(message));

    try {
      // Invocar el grafo
      const response = await this.app.invoke({ messages }, config);

      // Obtener el último mensaje (la respuesta del asistente)
      const lastMessage = response.messages[response.messages.length - 1];
      const content: string =
        typeof lastMessage.content === 'string'
          ? (lastMessage.content as string)
          : JSON.stringify(lastMessage.content);
            JSON.stringify(lastMessage.content);

      this.log.debug(`Response for thread ${threadId}: ${content.substring(0, 100)}...`);

      return content;
    } catch (error: unknown) {
      const err = error as Error;
      this.log.error(`Error processing chat: ${err.message}`, err.stack);
      throw error;
    }
  }

  /**
   * Obtiene el historial de conversación de un thread
   * @param threadId - ID del hilo de conversación
   * @returns Array de mensajes del historial
   */
  async getHistory(threadId: string): Promise<{ role: string; content: string }[]> {
    try {
      const state = await this.app.getState({ configurable: { thread_id: threadId } });

      if (!state || !state.values || !state.values.messages) {
        return [];
      }

      return state.values.messages.map((msg: BaseMessage) => ({
        role: msg.type === 'human' ? 'user' : msg.type === 'ai' ? 'assistant' : 'system',
        content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
      }));
    } catch (error: unknown) {
      const err = error as Error;
      this.log.warn(`Could not get history for thread ${threadId}: ${err.message}`);
      return [];
    }
  }

  /**
   * Stream de respuesta para respuestas en tiempo real
   * @param message - El mensaje del usuario
   * @param threadId - ID del hilo de conversación
   * @param onChunk - Callback para cada chunk de texto
   */
  async chatStream(message: string, threadId = 'default', onChunk: (chunk: string) => void): Promise<string> {
    this.log.debug(`Streaming message for thread ${threadId}: ${message}`);

    const config = {
      configurable: { thread_id: threadId },
    };

    const messages = [new HumanMessage(message)];
    let fullResponse = '';

    try {
      const stream = await this.app.stream({ messages }, { ...config, streamMode: 'messages' });

      for await (const [msg] of stream as AsyncIterable<[any, any]>) {
        if (msg.content) {
          const content: string =
            typeof msg.content === 'string'
              ? (msg.content as string)
              : JSON.stringify(msg.content);
          fullResponse += content;
          onChunk(content);
        }
      }

      return fullResponse;
    } catch (error: unknown) {
      const err = error as Error;
      this.log.error(`Error streaming chat: ${err.message}`, err.stack);
      throw error;
    }
  }
}
