import { StateGraph, Annotation } from '@langchain/langgraph';
import { BaseChatModel } from '@langchain/core/language_models/chat_models';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { ASSISTANT_MODEL, UserInputChannel, FormattedOutputSchema, SMSFormattedOutputSchema } from './assistant.schema';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';

const StateAnnotation = Annotation.Root({
  input: Annotation<string>,
  channel: Annotation<UserInputChannel>,
  output: Annotation<string[]>,
});

@Injectable()
export class FormatterService {
  private readonly log = new Logger(FormatterService.name);
  private readonly graph;

  constructor(@Inject(ASSISTANT_MODEL) private readonly model: BaseChatModel) {
    this.graph = new StateGraph(StateAnnotation)
      .addNode('sms', (state) => this.formatForSMS(state), {
        retryPolicy: { maxAttempts: 3 },
      })
      .addNode('web', (state) => this.formatForWeb(state))
      .addNode('whatsapp', (state) => this.formatForWhatsApp(state))
      .addConditionalEdges('__start__', (state) => this.routeFormattingRequest(state), ['sms', 'web', 'whatsapp'])
      .addEdge('sms', '__end__')
      .addEdge('web', '__end__')
      .addEdge('whatsapp', '__end__')
      .compile();
  }

  private routeFormattingRequest(state: typeof StateAnnotation.State) {
    this.log.debug('Routing formatting request...');
    return state.channel;
  }

  private async formatForSMS(state: typeof StateAnnotation.State) {
    this.log.debug('Formatting for SMS...');
    const structuredModel = this.model.withStructuredOutput(SMSFormattedOutputSchema);
    const response = await structuredModel.invoke([new SystemMessage(this.getSMSSystemPrompt()), new HumanMessage(state.input)]);
    return { output: response.messages };
  }

  private async formatForWeb(state: typeof StateAnnotation.State) {
    this.log.debug('Formatting for Web...');
    const structuredModel = this.model.withStructuredOutput(FormattedOutputSchema);
    const response = await structuredModel.invoke([new SystemMessage(this.getWebSystemPrompt()), new HumanMessage(state.input)]);
    return { output: response.messages };
  }

  private async formatForWhatsApp(state: typeof StateAnnotation.State) {
    this.log.debug('Formatting for WhatsApp...');
    const structuredModel = this.model.withStructuredOutput(FormattedOutputSchema);
    const response = await structuredModel.invoke([new SystemMessage(this.getWhatsAppSystemPrompt()), new HumanMessage(state.input)]);
    return { output: response.messages };
  }

  private getWebSystemPrompt(): string {
    return `Eres un asistente de formateo. Tu trabajo es tomar respuestas de texto y formatearlas apropiadamente para visualización web.

INSTRUCCIONES:
- Formatea el contenido usando Markdown
- Usa **negritas**, _cursivas_, listas, headers, y \`código\` donde sea apropiado
- Mantén la información clara y bien estructurada
- Devuelve el resultado en el campo "messages" como un array con un único elemento`;
  }

  private getWhatsAppSystemPrompt(): string {
    return `Eres un asistente de formateo para WhatsApp.

INSTRUCCIONES:
- Usa *negritas* con asteriscos
- Usa _cursivas_ con guiones bajos
- Usa formato ~tachado~ si es necesario
- Mantén el mensaje claro y conciso
- Devuelve el resultado en el campo "messages" como un array con un único elemento`;
  }

  private getSMSSystemPrompt(): string {
    return `Eres un formateador de mensajes SMS con una RESTRICCIÓN CRÍTICA de longitud.

⚠️ REGLA ABSOLUTA E INQUEBRANTABLE:
Cada mensaje en el array "messages" DEBE tener MÁXIMO 160 caracteres. NO HAY EXCEPCIONES.
Si un mensaje tiene 161 o más caracteres, HAS FALLADO.

ANTES de devolver tu respuesta, CUENTA los caracteres de CADA mensaje.
Si alguno excede 160, DEBES dividirlo en mensajes más cortos.

INSTRUCCIONES:
1. SOLO texto plano - sin formato, sin emojis, sin caracteres especiales innecesarios
2. Si el contenido es largo, divídelo en MÚLTIPLES mensajes cortos
3. Numera los mensajes cuando sean múltiples: "1/3: texto...", "2/3: texto...", "3/3: texto..."
4. Sé extremadamente conciso - elimina palabras innecesarias
5. Cada mensaje debe ser comprensible por sí solo
6. Prioriza la información más importante

EJEMPLO de mensaje CORRECTO (≤160 chars):
"1/2: Margarita: 2oz tequila, 1oz triple sec, 1oz lima. Agitar con hielo, servir en copa escarchada con sal."

EJEMPLO de mensaje INCORRECTO (>160 chars):
"Para preparar una Margarita clásica necesitas los siguientes ingredientes: 2 onzas de tequila blanco, 1 onza de triple sec, 1 onza de jugo de lima fresco..."

RECUERDA: Cuenta los caracteres. Máximo 160 por mensaje. SIEMPRE.`;
  }

  async formatResponse(message: string, channel: UserInputChannel): Promise<string[]> {
    this.log.debug('Formatting response...');
    const response = await this.graph.invoke({
      input: message,
      channel: channel,
    });
    const formatted = response.output || [message];
    this.log.debug('Formatting complete.');
    return formatted;
  }
}
