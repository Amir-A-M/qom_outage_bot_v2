import { describe, it, expect } from 'vitest';
import { parsePlaces, stringifyPlaces } from './../../src/utils/placeParser';
import type { Place } from './../../src/types/common';

describe('placeUtils', () => {
  it('parsePlaces converts valid input to Place array', () => {
    const input = 'Home\n123 Main St\n\nWork\n456 Office Rd';
    expect(parsePlaces(input)).toEqual([
      { alias: 'Home', phrase: '123 Main St' },
      { alias: 'Work', phrase: '456 Office Rd' },
    ]);
  });

  it('parsePlaces handles empty input', () => {
    expect(parsePlaces('')).toEqual([]);
  });

  it('stringifyPlaces converts Place array to string', () => {
    const places: Place[] = [
      { alias: 'Home', phrase: '123 Main St' },
      { alias: 'Work', phrase: '456 Office Rd' },
    ];
    expect(stringifyPlaces(places)).toEqual(
      'Home\n123 Main St\n\nWork\n456 Office Rd'
    );
  });
});
