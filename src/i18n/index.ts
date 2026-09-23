import { useCallback } from 'react';
import { useStore } from '../store/inventoryStore';
import type { Language } from '../types/types';
import { en } from './en';
import { ru } from './ru';

export type TKey = keyof typeof en;
export type TParams = Record<string, string | number>;
export type Translate = (key: TKey, params?: TParams) => string;

const DICTIONARIES: Record<Language, Record<TKey, string>> = { en, ru };

export function translate(language: Language, key: TKey, params?: TParams): string {
  const text = DICTIONARIES[language][key] ?? en[key] ?? key;
  if (!params) return text;
  return text.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

/** Translator bound to the language chosen in Settings. */
export function useT(): Translate {
  const language = useStore().state.settings.language;
  return useCallback((key, params) => translate(language, key, params), [language]);
}
