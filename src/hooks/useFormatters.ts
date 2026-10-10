import { useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { selectLocale } from '@/store/uiSlice';

const UNITS = ['byte', 'kilobyte', 'megabyte', 'gigabyte'] as const;

/** Dates, sizes and numbers in the active UI locale via Intl. */
export function useFormatters() {
  const locale = useAppSelector(selectLocale);
  return useMemo(() => {
    const date = new Intl.DateTimeFormat(locale, { dateStyle: 'medium' });
    const dateTime = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    const number = new Intl.NumberFormat(locale);
    const percent = new Intl.NumberFormat(locale, { style: 'percent', maximumFractionDigits: 0 });
    const relative = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const parse = (value: string) => new Date(value.length === 10 ? `${value}T00:00:00` : value);

    return {
      locale,
      formatDate: (value?: string) => (value ? date.format(parse(value)) : ''),
      formatDateTime: (value?: string) => (value ? dateTime.format(parse(value)) : ''),
      formatNumber: (value: number) => number.format(value),
      formatPercent: (value: number) => percent.format(value),
      formatBytes: (bytes: number) => {
        let value = bytes;
        let unit = 0;
        while (value >= 1000 && unit < UNITS.length - 1) {
          value /= 1000;
          unit += 1;
        }
        return new Intl.NumberFormat(locale, {
          style: 'unit',
          unit: UNITS[unit],
          unitDisplay: 'short',
          maximumFractionDigits: unit === 0 ? 0 : 1,
        }).format(value);
      },
      formatDuration: (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const rest = Math.round(seconds % 60);
        return `${number.format(minutes)}:${String(rest).padStart(2, '0')}`;
      },
      formatRelative: (value: string) => {
        const diffDays = Math.round((parse(value).getTime() - Date.now()) / 86_400_000);
        return Math.abs(diffDays) < 1 ? relative.format(0, 'day') : relative.format(diffDays, 'day');
      },
    };
  }, [locale]);
}
