import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  APIResponseSchema,
  Cocktail,
  CocktailFilter,
  FilterAPIResponseSchema,
  FilterCocktail,
  Ingredient,
  IngredientAPIResponseSchema,
} from './cocktaildb.schema';
import { catchError, map, Observable, of } from 'rxjs';

@Injectable()
export class CocktailDBService {
  private readonly log = new Logger(CocktailDBService.name);
  private readonly client = new HttpService(
    axios.create({
      baseURL: 'https://www.thecocktaildb.com/api/json/v1/1',
    }),
  );

  searchIngredient(name: string): Observable<Ingredient | null> {
    this.log.debug(`Searching for ingredient "${name}" in TheCocktailDB API`);
    return this.client.get('/search.php', { params: { i: name } }).pipe(
      map(({ data }) => IngredientAPIResponseSchema.parse(data)),
      map((data) => (data.length > 0 ? data[0] : null)),
      catchError((error) => {
        this.log.error(`Error searching for ingredient "${name}"`, error);
        return of(null);
      }),
    );
  }

  searchCocktail(filter: CocktailFilter): Observable<FilterCocktail[]> {
    this.log.debug(`Searching for cocktail with filter "${JSON.stringify(filter)}" in TheCocktailDB API`);
    return this.client
      .get('/filter.php', {
        params: {
          i: filter.ingredient,
          a: filter.type,
          g: filter.glass,
          c: filter.category,
        },
      })
      .pipe(
        map(({ data }) => FilterAPIResponseSchema.parse(data)),
        catchError((error) => {
          this.log.error(`Error searching for cocktail with filter "${JSON.stringify(filter)}"`, error);
          return of([]);
        }),
      );
  }

  searchCocktailByName(name: string): Observable<Cocktail[]> {
    this.log.debug(`Searching for cocktail "${name}" in TheCocktailDB API`);
    return this.client.get('/search.php', { params: { s: name } }).pipe(
      map(({ data }) => APIResponseSchema.parse(data)),
      catchError((error) => {
        this.log.error(`Error searching for cocktail "${name}"`, error);
        return of([]);
      }),
    );
  }

  getCocktailById(id: string): Observable<Cocktail | null> {
    this.log.debug(`Fetching cocktail with ID "${id}" from TheCocktailDB API`);
    return this.client.get('/lookup.php', { params: { i: id } }).pipe(
      map(({ data }) => APIResponseSchema.parse(data)),
      map((data) => (data.length > 0 ? data[0] : null)),
      catchError((error) => {
        this.log.error(`Error fetching cocktail with ID "${id}"`, error);
        return of(null);
      }),
    );
  }

  getRandomCocktail(): Observable<Cocktail | null> {
    this.log.debug('Fetching a random cocktail from TheCocktailDB API');
    return this.client.get('/random.php').pipe(
      map(({ data }) => APIResponseSchema.parse(data)),
      map((data) => (data.length > 0 ? data[0] : null)),
      catchError((error) => {
        this.log.error('Error fetching random cocktail', error);
        return of(null);
      }),
    );
  }

  listCategories(): Observable<string[]> {
    this.log.debug('Fetching cocktail categories from TheCocktailDB API');
    return this.client.get('/list.php?c=list').pipe(
      map((data) => {
        const raw = data.data;
        if (!raw.drinks || !Array.isArray(raw.drinks)) {
          this.log.warn('No categories found in response');
          return [];
        }
        return raw.drinks
          .filter((item: unknown): item is { strCategory: string } => {
            return typeof item === 'object' && item !== null && 'strCategory' in item && typeof item.strCategory === 'string';
          })
          .map((item: { strCategory: string }) => item.strCategory);
      }),
      catchError((error) => {
        this.log.error('Error fetching cocktail categories', error);
        return of([]);
      }),
    );
  }

  listIngredients(): Observable<string[]> {
    this.log.debug('Fetching cocktail ingredients from TheCocktailDB API');
    return this.client.get('/list.php?i=list').pipe(
      map((data) => {
        const raw = data.data;
        if (!raw.drinks || !Array.isArray(raw.drinks)) {
          this.log.warn('No ingredients found in response');
          return [];
        }
        return raw.drinks
          .filter((item: unknown): item is { strIngredient1: string } => {
            return typeof item === 'object' && item !== null && 'strIngredient1' in item && typeof item.strIngredient1 === 'string';
          })
          .map((item: { strIngredient1: string }) => item.strIngredient1);
      }),
      catchError((error) => {
        this.log.error('Error fetching cocktail ingredients', error);
        return of([]);
      }),
    );
  }

  listGlassTypes(): Observable<string[]> {
    this.log.debug('Fetching cocktail glass types from TheCocktailDB API');
    return this.client.get('/list.php?g=list').pipe(
      map((data) => {
        const raw = data.data;
        if (!raw.drinks || !Array.isArray(raw.drinks)) {
          this.log.warn('No glass types found in response');
          return [];
        }
        return raw.drinks
          .filter((item: unknown): item is { strGlass: string } => {
            return typeof item === 'object' && item !== null && 'strGlass' in item && typeof item.strGlass === 'string';
          })
          .map((item: { strGlass: string }) => item.strGlass);
      }),
      catchError((error) => {
        this.log.error('Error fetching cocktail glass types', error);
        return of([]);
      }),
    );
  }
}
