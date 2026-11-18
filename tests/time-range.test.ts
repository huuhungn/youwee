import { describe, expect, test } from 'bun:test';
import {
  autoFormatTimeInput,
  buildDownloadSections,
  formatTimeMarker,
  parseTimeToSeconds,
  validateTimeRange,
} from '@/lib/time-range';

describe('parseTimeToSeconds', () => {
  test.each([
    ['0', 0],
    ['45', 45],
    ['90', 90],
    ['1:30', 90],
    ['01:30', 90],
    ['75:00', 4500],
    ['1:05:30', 3930],
    ['12:00:00', 43200],
  ])('%s is %d seconds', (value, seconds) => {
    expect(parseTimeToSeconds(value)).toBe(seconds);
  });

  test.each([
    '',
    '1:5',
    '1:60',
    '1:60:00',
    '1:00:60',
    '123',
    'abc',
    '1:30:',
    ':30',
    '1-30',
    '1:2:3:4',
  ])('%p is invalid', (value) => {
    expect(parseTimeToSeconds(value)).toBe(-1);
  });
});

describe('autoFormatTimeInput', () => {
  test.each([
    ['', ''],
    ['45', '45'],
    ['130', '1:30'],
    ['0130', '01:30'],
    ['10530', '1:05:30'],
    ['1:05:30x', '1:05:30'],
    ['1234567', '12:34:56'],
  ])('%p becomes %p', (raw, formatted) => {
    expect(autoFormatTimeInput(raw)).toBe(formatted);
  });
});

test('formatTimeMarker uses M:SS below an hour and H:MM:SS from an hour on', () => {
  expect(formatTimeMarker(5)).toBe('0:05');
  expect(formatTimeMarker(90)).toBe('1:30');
  expect(formatTimeMarker(3599)).toBe('59:59');
  expect(formatTimeMarker(3600)).toBe('1:00:00');
  expect(formatTimeMarker(3930)).toBe('1:05:30');
});

describe('validateTimeRange', () => {
  test('empty fields are not errors but cannot be applied', () => {
    expect(validateTimeRange('', '')).toMatchObject({ error: null, canApply: false });
    expect(validateTimeRange('1:00', '')).toMatchObject({ error: null, canApply: false });
  });

  test('a valid range is applied in its normalized form', () => {
    expect(validateTimeRange('45', '1:30')).toMatchObject({
      error: null,
      canApply: true,
      normalizedStart: '0:45',
      normalizedEnd: '1:30',
    });
    expect(validateTimeRange('59:30', '01:00:05')).toMatchObject({
      canApply: true,
      normalizedStart: '59:30',
      normalizedEnd: '1:00:05',
    });
  });

  test('a malformed field is a format error on that field', () => {
    expect(validateTimeRange('1:75', '2:00')).toMatchObject({
      isStartValid: false,
      isEndValid: true,
      error: 'format',
      canApply: false,
    });
    expect(validateTimeRange('1:00', '1:5')).toMatchObject({
      isStartValid: true,
      isEndValid: false,
      error: 'format',
    });
  });

  test('the end must be after the start', () => {
    expect(validateTimeRange('2:00', '1:00')).toMatchObject({
      isRangeValid: false,
      error: 'order',
      canApply: false,
    });
    expect(validateTimeRange('1:00', '60')).toMatchObject({ error: 'order', canApply: false });
  });
});

describe('buildDownloadSections', () => {
  test('builds the yt-dlp time range value', () => {
    expect(buildDownloadSections('0:45', '1:30')).toBe('*0:45-1:30');
    expect(buildDownloadSections('59:30', '1:00:05')).toBe('*59:30-1:00:05');
  });

  test('returns nothing unless both ends are set', () => {
    expect(buildDownloadSections(undefined, undefined)).toBeUndefined();
    expect(buildDownloadSections('0:45', undefined)).toBeUndefined();
    expect(buildDownloadSections('', '1:30')).toBeUndefined();
  });
});
