import { Module } from '@nestjs/common';
import { CocktailDBService } from './cocktaildb.service';
import { CocktaildbController } from './cocktaildb.controller';

@Module({
  providers: [CocktailDBService],
  exports: [CocktailDBService],
  controllers: [CocktaildbController],
})
export class CocktailDBModule {}
