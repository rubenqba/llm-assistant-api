import { Controller, Get, Query } from '@nestjs/common';
import { CocktailDBService } from './cocktaildb.service';
import { ZodSerializerDto } from 'nestjs-zod';
import { CocktailSchema } from './cocktaildb.schema';

@Controller('cocktaildb')
export class CocktaildbController {
  constructor(private readonly cocktails: CocktailDBService) {}

  @Get('search')
  @ZodSerializerDto(CocktailSchema.array())
  searchCocktail(@Query('name') name: string) {
    return this.cocktails.searchCocktailByName(name);
  }
}
