import { CheerioAPI } from 'cheerio';
import { Error, OutageTimeRange, Place, PlaceOutage } from '../../types/common';
import { newDate } from 'date-fns-jalali';

export const faToEnDigits = (str: string): string => {
  const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
  return str.replace(/[۰-۹]/g, (match) => {
    return String(persianDigits.indexOf(match));
  });
};

export const parseOutageTime = (raw: string): OutageTimeRange | null => {
  raw = faToEnDigits(raw);

  // Match the time range (e.g., "مثل "۹ تا ۱۱)
  const match = raw.match(/(\d+)\s*تا\s*(\d+)/);
  if (!match) return null;

  const startHour = parseInt(match[1], 10);
  const endHour = parseInt(match[2], 10);
  return { startHour, endHour };
};

// export const getOutageTableDate = ($: CheerioAPI): Date => {
//   const tableTitle = $('.ItemTitle.AnnTitle').text();
//   return new Date();
// };

// Map Persian ordinal words to numbers
function persianWordToNumber(word: string): number | null {
  const map: { [key: string]: number } = {
    اول: 1,
    دوم: 2,
    سوم: 3,
    چهارم: 4,
    پنجم: 5,
    ششم: 6,
    هفتم: 7,
    هشتم: 8,
    نهم: 9,
    دهم: 10,
    یازدهم: 11,
    دوازدهم: 12,
    سیزدهم: 13,
    چهاردهم: 14,
    پانزدهم: 15,
    شانزدهم: 16,
    هفدهم: 17,
    هجدهم: 18,
    نوزدهم: 19,
    بیستم: 20,
    'بیست و یکم': 21,
    'بیست و دوم': 22,
    'بیست و سوم': 23,
    'بیست و چهارم': 24,
    'بیست و پنجم': 25,
    'بیست و ششم': 26,
    'بیست و هفتم': 27,
    'بیست و هشتم': 28,
    'بیست و نهم': 29,
    سی‌ام: 30,
    'سی ام': 30,
    'سی‌ و یکم': 31,
    'سی و یکم': 31,
  };
  return map[word.trim()] || null;
}

/**
 * Extracts Jalali date from table title and returns a Gregorian Date.
 * @param $ CheerioAPI instance
 * @returns Gregorian Date object
 * @example Input: "برنامه مدیریت بار احتمالی شبکه توزیع برق استان قم در روز سه شنبه مورخ ۱۴ مرداد ماه ۱۴۰۴"
 *          Output: new Date(2025, 7, 5) // 5 August 2025
 */
export const getOutageTableDate = ($: CheerioAPI): Date | Error => {
  const tableTitle = $('.ItemTitle.AnnTitle').text();

  // Unified regex for numeric (e.g., "۱۴") or ordinal (e.g., "پنجم") dates
  const regex =
    /مورخ\s+([\d۰-۹]+|[آابپتثجچحخدذرزسشصضطظعغفقکگلمنوهی\s‌]+)\s+([آابپتثجچحخدذرزسشصضطظعغفقکگلمنوهی]+)\s+ماه\s+([\d۰-۹]+)/;
  const match = tableTitle.match(regex);
  if (!match) return { error: 'Invalid date format', code: 400 };

  const [, dayRaw, month, yearRaw] = match;
  const year = parseInt(faToEnDigits(yearRaw));
  const day = parseInt(faToEnDigits(dayRaw)) || persianWordToNumber(dayRaw);
  if (!day) return { error: `Invalid day: ${dayRaw}`, code: 400 };

  const months = [
    'فروردین',
    'اردیبهشت',
    'خرداد',
    'تیر',
    'مرداد',
    'شهریور',
    'مهر',
    'آبان',
    'آذر',
    'دی',
    'بهمن',
    'اسفند',
  ];
  const monthIndex = months.indexOf(month);
  if (monthIndex === -1) return { error: `Invalid month: ${month}`, code: 400 };

  return newDate(year, monthIndex, day);
};

/**
 * Parses outage data for multiple places from QEPD site HTML.
 * @param $ CheerioAPI instance
 * @param places Array of places to search for
 * @returns Array of PlaceOutage or Error if no places or times found
 */
export function parseOutagePlaces(
  $: CheerioAPI,
  places: Place[]
): PlaceOutage[] | Error {
  if (!places.length) {
    return { error: 'No places provided', code: 400 };
  }

  const descriptionLines = $('.AnnDescription p')
    .map((i, el) => $(el).text())
    .get();
  const placeOutages: PlaceOutage[] = [];

  for (const place of places) {
    let found = false;
    let outageTimes: OutageTimeRange[] = [];

    // Find place and its associated outage times
    for (let i = 0; i < descriptionLines.length; i++) {
      const text = descriptionLines[i];

      if (text.includes(place.phrase)) {
        found = true;
        // Look backwards for outage times (marked by ❌)
        for (let j = i - 1; j >= 0; j--) {
          const prevText = descriptionLines[j];

          if (prevText.includes('❌')) {
            const time = parseOutageTime(prevText);
            if (time) outageTimes.push(time);
            break;
          }
        }
      }
    }

    if (!found || !outageTimes.length) {
      continue;
    }

    placeOutages.push({ place, outageTimes });
  }

  return placeOutages;
}
