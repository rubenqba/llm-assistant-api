import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BaseMessage, createAgent, HumanMessage, tool } from 'langchain';
import { BaseCheckpointSaver } from '@langchain/langgraph';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { firstValueFrom } from 'rxjs';
import { CocktailDBService } from 'src/cocktaildb/cocktaildb.service';
import { ASSISTANT_MODEL, Message } from './assistant.schema';
import type { LanguageModelLike } from '@langchain/core/language_models/base';
import * as z from 'zod';

@Injectable()
export class MixologyService implements OnModuleInit {
  private readonly log = new Logger(MixologyService.name);
  private agent: ReturnType<typeof createAgent>;
  private checkpointer: BaseCheckpointSaver;

  constructor(
    private readonly cocktails: CocktailDBService,
    @Inject(ASSISTANT_MODEL) private readonly model: LanguageModelLike,
  ) {}

  onModuleInit() {
    this.initializeAgent();
    this.log.debug('MixologyService initialized with agent and tools.');
  }

  private initializeAgent() {
    const tools = [
      tool(
        async () => {
          this.log.debug(`list_ingredients called...`);
          const results = await firstValueFrom(this.cocktails.listIngredients());
          this.log.debug(`list_ingredients returned ${results.length} ingredients.`);
          return results.join(', ');
        },
        {
          name: 'list_ingredients',
          description: 'Use this tool to list all ingredients to create a cocktail.',
          schema: z.object({}),
        },
      ),
      tool(
        async () => {
          this.log.debug(`list_categories called...`);
          const results = await firstValueFrom(this.cocktails.listCategories());
          this.log.debug(`list_categories returned ${results.length} categories.`);
          return results.join(', ');
        },
        {
          name: 'list_categories',
          description: 'Use this tool to list all cocktail categories to create a cocktail.',
          schema: z.object({}),
        },
      ),
      tool(
        async ({ name }) => {
          this.log.debug(`get_cocktail_by_name called with name: ${name}`);
          const list = await firstValueFrom(this.cocktails.searchCocktailByName(name));
          this.log.debug(`get_cocktail_by_name returned cocktail: ${list.length} items.`);
          return JSON.stringify(list);
        },
        {
          name: 'get_cocktail_by_name',
          description: 'Use this tool to search cocktails by name.',
          schema: z.object({
            name: z.string().describe('The name of the cocktail to retrieve.'),
          }),
        },
      ),
      tool(
        async () => {
          this.log.debug(`get_random_cocktail called`);
          const cocktail = await firstValueFrom(this.cocktails.getRandomCocktail());
          this.log.debug(`get_random_cocktail returned cocktail: ${cocktail ? 1 : 0} items.`);
          if (!cocktail) {
            return 'No cocktail found.';
          }
          return JSON.stringify(cocktail);
        },
        {
          name: 'get_random_cocktail',
          description: 'Use this tool to retrieve a random cocktail.',
          schema: z.object({}),
        },
      ),
      tool(
        async ({ drinkId }) => {
          this.log.debug(`get_cocktail_by_id called with id: ${drinkId}`);
          const cocktail = await firstValueFrom(this.cocktails.getCocktailById(drinkId));
          this.log.debug(`get_cocktail_by_id returned cocktail: ${cocktail ? 1 : 0} items.`);
          if (!cocktail) {
            return 'No cocktail found.';
          }
          return JSON.stringify(cocktail);
        },
        {
          name: 'get_cocktail_by_id',
          description: 'Use this tool to get a cocktail by its unique ID.',
          schema: z.object({
            drinkId: z.string().describe('The unique ID of the cocktail to retrieve.'),
          }),
        },
      ),
      tool(
        async (filter) => {
          this.log.debug(`filter_cocktails called with filter: ${JSON.stringify(filter)}`);
          const list = await firstValueFrom(this.cocktails.searchCocktail(filter));
          this.log.debug(`filter_cocktails returned ${list.length} items.`);
          return JSON.stringify(list);
        },
        {
          name: 'filter_cocktails',
          description: 'Use this tool to filter cocktails by various criteria.',
          schema: z.object({
            category: z.string().optional().describe('The category of the cocktail (e.g., "Ordinary Drink", "Cocktail")'),
            glass: z.string().optional().describe('The type of glass used to serve the cocktail.'),
            ingredient: z.string().optional().describe('The main ingredient of the cocktail.'),
            type: z.enum(['Alcoholic', 'Non_Alcoholic']).optional().describe('The type of the cocktail.'),
          }),
        },
      ),
    ];

    const sqliteCheckpointer = SqliteSaver.fromConnString('./mixology_agent_checkpoints.db');

    this.checkpointer = sqliteCheckpointer;
    this.agent = createAgent({
      model: this.model,
      systemPrompt: `You are Mixology, a service that specializes in discussing cocktails and mixology.
        Use the tools provided first to answer user questions about cocktails.
        Always give response in a friendly HTML format suitable for direct display to end users.`,
      tools,
      checkpointer: this.checkpointer ?? false,
    });
  }

  async invoke(message: Message): Promise<Message> {
    this.log.debug(`MixologyService received input: ${message.content} (thread: ${message.thread})`);

    const response = await this.agent.invoke(
      { messages: [new HumanMessage(message.content)] },
      { configurable: { thread_id: message.thread } },
    );

    const lastMessage = response.messages[response.messages.length - 1];
    this.log.debug(`Agent response completed`);
    const content = lastMessage?.content;
    return {
      role: 'assistant',
      content: typeof content === 'string' ? content : JSON.stringify(content),
      thread: message.thread,
    };
  }

  async getConversationHistory(thread: string): Promise<Message[]> {
    this.log.debug(`Fetching conversation history for thread: ${thread}`);
    const checkpoint = await this.checkpointer.get({ configurable: { thread_id: thread } });

    const history = (checkpoint?.channel_values.messages || []) as unknown as BaseMessage[];
    this.log.debug(`Checkpoint has ${history.length} messages.`);
    const messages: Message[] = history
      .filter((msg) => msg.type === 'human' || msg.type === 'ai')
      .map((msg) => ({
        role: msg.type === 'human' ? 'user' : 'assistant',
        content: msg.text,
        thread: thread,
      }));
    return messages;
  }
}
