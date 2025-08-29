import { format, isToday, isYesterday, isTomorrow } from 'date-fns-jalali';

/**
 * Convert a Date to a readable Jalali string:
 * امروز / دیروز / فردا  6 شهریور
 */
export function toReadableJalali(date: Date): string {
  let prefix = '';
  if (isToday(date)) prefix = 'امروز';
  if (isYesterday(date)) prefix = 'دیروز';
  if (isTomorrow(date)) prefix = 'فردا';

  const dateString = format(date, 'd MMMM');
  return prefix ? `${prefix} ${dateString}` : dateString;
}
