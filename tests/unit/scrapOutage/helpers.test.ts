import { describe, it, expect, test } from 'vitest';
import {
  getOutageTableDate,
  parseOutagePlaces,
  parseOutageTime,
} from '../../../src/modules/scrapeOutage/helpers';
import ScrapPowerOutage from '../../../src/modules/scrapeOutage';
import { OutageTimeRange } from '../../../src/types/common';
import { load } from 'cheerio';

test('parseOutageTime()', () => {
  const rawStrings = [
    '❌قطعی احتمالی برق در ساعت ۹ تا ۱۱',
    '❌قطعی احتمالی برق در ساعت ۱۰ تا ۱۲',
  ];

  const outageTimes: OutageTimeRange[] = rawStrings
    .map(parseOutageTime)
    .filter((range): range is OutageTimeRange => range !== null);

  // Validations
  expect(outageTimes).toHaveLength(2);
  expect(outageTimes[0]).toEqual({ startHour: 9, endHour: 11 });
  expect(outageTimes[1]).toEqual({ startHour: 10, endHour: 12 });

  // Test invalid input
  const invalidString = '❌قطعی احتمالی برق در ساعت نامعتبر';
  const invalidResult = parseOutageTime(invalidString);
  expect(invalidResult).toBeNull();
});

describe('getOutageTableDate()', () => {
  it('parses numeric Jalali date', () => {
    const $ = load(
      '<div class="ItemTitle AnnTitle">مورخ ۱۴ مرداد ماه ۱۴۰۴</div>'
    );
    expect(getOutageTableDate($)).toEqual(new Date(2025, 7, 5));
  });

  it('parses ordinal Jalali date', () => {
    const $ = load(
      '<div class="ItemTitle AnnTitle">مورخ پنجم شهریور ماه ۱۴۰۴</div>'
    );
    expect(getOutageTableDate($)).toEqual(new Date(2025, 7, 27));
  });

  it('throws for invalid date format', () => {
    const $ = load('<div class="ItemTitle AnnTitle">مورخ نامعتبر</div>');
    const error = getOutageTableDate($);
    expect(error).toEqual({ error: 'Invalid date format', code: 400 });
  });
});

describe('parseOutagePlaces()', () => {
  it('should return error if no places are provided', () => {
    const $ = load('<div></div>');
    const result = parseOutagePlaces($, []);
    expect(result).toEqual({ error: 'No places provided', code: 400 });
  });

  it('should return 1 outage time', () => {
    const html = `
      <div class="AnnDescription">
        <p>❌ ساعت ۹ تا ۱۱</p>
        <p>بلوار جمهوری فلکه مرجعیت خیابان ارمیده خیابان عدالت</p>

        <p>❌ ساعت ۱۲ تا ۱۴</p>
      </div>
    `;
    const $ = load(html);

    const result = parseOutagePlaces($, [
      { phrase: 'خیابان عدالت', alias: 'دفتر' },
    ]);

    expect(Array.isArray(result)).toBe(true);

    if (Array.isArray(result)) {
      expect(result[0].place.phrase).toBe('خیابان عدالت');
      expect(result[0].outageTimes).toEqual([{ startHour: 9, endHour: 11 }]);
    }
  });

  it('should return 2 places and [1, 2] outage time', () => {
    const html = `
      <div class="AnnDescription">
        <p>❌ ساعت ۹ تا ۱۱</p>
        <p>بلوار جمهوری فلکه مرجعیت خیابان ارمیده خیابان عدالت</p>

        <p>❌ ساعت ۱۲ تا ۱۴</p>
        <p>خیابان رسالت بسمت شهرک ولایت</p>

        <p>❌ ساعت ۱۹ تا ۲۰</p>
        <p>بلوار جمهوری فلکه مرجعیت خیابان ارمیده خیابان عدالت</p>
      </div>
    `;
    const $ = load(html);

    const result = parseOutagePlaces($, [
      { phrase: 'رسالت', alias: 'خانه' },
      { phrase: 'خیابان عدالت', alias: 'دفتر' },
    ]);

    expect(Array.isArray(result)).toBe(true);

    if (Array.isArray(result)) {
      expect(result[0].place.phrase).toBe('رسالت');
      expect(result[0].outageTimes).toEqual([{ startHour: 12, endHour: 14 }]);

      expect(result[1].place.phrase).toBe('خیابان عدالت');
      expect(result[1].outageTimes).toEqual([
        { startHour: 9, endHour: 11 },
        { startHour: 19, endHour: 20 },
      ]);
    }
  });
});
