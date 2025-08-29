import { Place } from '../types/common';

/**
 * Parse user input string into Place[]
 * Expected format:
 * alias\n
 * phrase\n
 * \n
 * alias\n
 * phrase ...
 */
export function parsePlaces(input: string): Place[] {
  return input
    .split(/\n\s*\n/)
    .map((block) => block.trim().split('\n'))
    .filter((lines) => lines.length >= 2)
    .map(([alias, phrase]) => ({
      alias: alias.trim(),
      phrase: phrase.trim(),
    }));
}

/**
 * Convert Place[] back to user-friendly string format
 */
export function stringifyPlaces(places: Place[]): string {
  return places.map((p) => `${p.alias}\n${p.phrase}`).join('\n\n');
}
