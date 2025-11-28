import { z } from 'zod';

/**
 * 1. RAW SCHEMA (La realidad de la API)
 * Capturamos los campos tal cual vienen, casi todo como string o null.
 */
const RawIngredientSchema = z
  .object({
    idIngredient: z.string(),
    strIngredient: z.string(),
    strDescription: z.string().nullable(),
    strType: z.string().nullable(), // Ej: "Vodka", "Whisky"
    strAlcohol: z.string().nullable(), // Viene como "Yes", "No" o null
    strABV: z.string().nullable(), // Alcohol By Volume, viene como string "40"
  })
  .loose();

/**
 * 2. CLEAN SCHEMA (Tu estructura ideal)
 * Tipos de datos correctos: booleanos y números reales.
 */
export const IngredientSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  type: z.string().nullable(),

  // Lógica de negocio limpia
  isAlcoholic: z.boolean(),
  abv: z.number().nullable(), // Ahora es un número real para hacer cálculos
});

/**
 * 3. TRANSFORMER
 * Limpieza de datos y conversión de tipos.
 */
export const IngredientTransformer = RawIngredientSchema.transform((raw) => {
  // 1. Convertir "Yes"/"No" a Booleano
  const isAlcoholic = raw.strAlcohol?.toLowerCase() === 'yes';

  // 2. Convertir ABV de string a número (si existe)
  let abv: number | null = null;
  if (raw.strABV) {
    const parsed = parseFloat(raw.strABV);
    if (!isNaN(parsed)) {
      abv = parsed;
    }
  }

  // 3. Limpiar descripción (a veces trae saltos de línea excesivos \r\n)
  const description = raw.strDescription ? raw.strDescription.replace(/(\r\n|\n|\r)/gm, ' ').trim() : null;

  return {
    id: raw.idIngredient,
    name: raw.strIngredient,
    description: description,
    type: raw.strType || null,
    isAlcoholic: isAlcoholic,
    abv: abv,
  };
}).pipe(IngredientSchema);

// Endpoint Response Wrapper para search.php?i={nombre} o lookup.php?i={id}
export const IngredientAPIResponseSchema = z
  .object({
    ingredients: z.array(z.any()).nullable(),
  })
  .transform((data) => {
    if (!data.ingredients) return [];
    const parsed = z.array(IngredientTransformer).safeParse(data.ingredients);
    return parsed.success ? parsed.data : [];
  });

// Tipo inferido
export type Ingredient = z.infer<typeof IngredientSchema>;

/**
 * 1. RAW SCHEMA
 * Agregamos explícitamente los campos de idiomas para que TypeScript los reconozca.
 */
const RawCocktailSchema = z
  .object({
    idDrink: z.string(),
    strDrink: z.string(),
    strCategory: z.string().nullable(),
    strAlcoholic: z.string().nullable(),
    strGlass: z.string().nullable(),
    strDrinkThumb: z.string().nullable(),
    strTags: z.string().nullable(),

    // Instrucciones principal (Inglés)
    strInstructions: z.string().nullable(),

    // Instrucciones en otros idiomas (pueden venir nulos)
    strInstructionsES: z.string().nullable(),
    strInstructionsDE: z.string().nullable(),
    strInstructionsFR: z.string().nullable(),
    strInstructionsIT: z.string().nullable(),

    // Nota: Usamos passthrough para ignorar ingredient1..15 aquí y tratarlos dinámicamente
  })
  .loose();

/**
 * 2. CLEAN SCHEMA
 * Agregamos el objeto 'translations' para mantener el root limpio.
 */
export const CocktailSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.string(),
  type: z.enum(['Alcoholic', 'Non_Alcoholic', 'Optional_Alcohol', 'Unknown']),
  glass: z.string(),
  image: z.url().nullable(),
  tags: z.array(z.string()),

  // Instrucción por defecto (generalmente EN) para acceso rápido
  instructions: z.string(),

  // Nuevo objeto para traducciones
  translations: z.object({
    es: z.string().nullable(),
    de: z.string().nullable(),
    fr: z.string().nullable(),
    it: z.string().nullable(),
  }),

  ingredients: z.array(
    z.object({
      name: z.string(),
      measure: z.string().nullable(),
    }),
  ),
});

/**
 * 3. TRANSFORMER
 */
export const CocktailTransformer = RawCocktailSchema.transform((raw) => {
  // Lógica de Ingredientes (igual que antes)
  const ingredients: { name: string; measure: string | null }[] = [];
  for (let i = 1; i <= 15; i++) {
    const ingredientName = (raw as any)[`strIngredient${i}`];
    const measure = (raw as any)[`strMeasure${i}`];
    if (ingredientName && typeof ingredientName === 'string' && ingredientName.trim() !== '') {
      ingredients.push({
        name: ingredientName.trim(),
        measure: measure ? measure.trim() : null,
      });
    }
  }

  // Normalización de tipo
  let type: 'Alcoholic' | 'Non_Alcoholic' | 'Optional_Alcohol' | 'Unknown' = 'Unknown';
  if (raw.strAlcoholic === 'Alcoholic') type = 'Alcoholic';
  else if (raw.strAlcoholic === 'Non alcoholic') type = 'Non_Alcoholic';
  else if (raw.strAlcoholic === 'Optional alcohol') type = 'Optional_Alcohol';

  return {
    id: raw.idDrink,
    name: raw.strDrink,
    category: raw.strCategory || 'Unknown',
    type: type,
    glass: raw.strGlass || 'Standard Glass',
    instructions: raw.strInstructions || 'No instructions provided.',

    // Mapeo limpio de traducciones
    translations: {
      es: raw.strInstructionsES || null,
      de: raw.strInstructionsDE || null,
      fr: raw.strInstructionsFR || null,
      it: raw.strInstructionsIT || null,
    },

    image: raw.strDrinkThumb,
    tags: raw.strTags ? raw.strTags.split(',').map((t) => t.trim()) : [],
    ingredients: ingredients,
  };
}).pipe(CocktailSchema);

// Endpoint Response Wrapper
export const APIResponseSchema = z
  .object({
    drinks: z.array(z.any()).nullable(),
  })
  .transform((data) => {
    if (!data.drinks) return [];
    const parsed = z.array(CocktailTransformer).safeParse(data.drinks);
    return parsed.success ? parsed.data : [];
  });

export type Cocktail = z.infer<typeof CocktailSchema>;

/**
 * 1. RAW SCHEMA (Preview)
 * Solo lo que devuelve filter.php.
 * Usamos .loose() para evitar errores si la API decide enviar algo extra.
 */
const RawFilterCocktailSchema = z
  .object({
    idDrink: z.string(),
    strDrink: z.string(),
    strDrinkThumb: z.string().nullable(),
  })
  .loose();

/**
 * 2. CLEAN SCHEMA (Preview)
 * Una versión ligera para mostrar listas de resultados.
 */
export const FilterCocktailSchema = z.object({
  id: z.string(),
  name: z.string(),
  image: z.url().nullable(),
});

/**
 * 3. TRANSFORMER
 */
export const FilterCocktailTransformer = RawFilterCocktailSchema.transform((raw) => {
  return {
    id: raw.idDrink,
    name: raw.strDrink,
    image: raw.strDrinkThumb,
  };
}).pipe(FilterCocktailSchema);

// Endpoint Response Wrapper para filter.php
export const FilterAPIResponseSchema = z
  .object({
    drinks: z.array(z.any()).nullable(),
  })
  .transform((data) => {
    if (!data.drinks) return [];
    // Parseamos cada elemento de la lista con el transformador ligero
    const parsed = z.array(FilterCocktailTransformer).safeParse(data.drinks);
    return parsed.success ? parsed.data : [];
  });

// Tipo inferido
export type FilterCocktail = z.infer<typeof FilterCocktailSchema>;

export type CocktailFilter = {
  ingredient?: string;
  category?: string;
  glass?: string;
  type?: 'Alcoholic' | 'Non_Alcoholic';
};
