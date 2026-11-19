import { describe, expect, it } from 'vitest';
import { timeAgo } from './timeAgo';

const NOW = new Date('2026-11-19T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();

describe('timeAgo', () => {
  it('kurang dari 60 detik -> baru saja', () => {
    expect(timeAgo(ago(0), NOW)).toBe('baru saja');
    expect(timeAgo(ago(59_000), NOW)).toBe('baru saja');
  });

  it('menit', () => {
    expect(timeAgo(ago(60_000), NOW)).toBe('1 menit lalu');
    expect(timeAgo(ago(3 * 60_000), NOW)).toBe('3 menit lalu');
    expect(timeAgo(ago(59 * 60_000), NOW)).toBe('59 menit lalu');
  });

  it('jam', () => {
    expect(timeAgo(ago(60 * 60_000), NOW)).toBe('1 jam lalu');
    expect(timeAgo(ago(5 * 60 * 60_000), NOW)).toBe('5 jam lalu');
    expect(timeAgo(ago(23 * 60 * 60_000), NOW)).toBe('23 jam lalu');
  });

  it('hari, bulan, tahun', () => {
    expect(timeAgo(ago(24 * 60 * 60_000), NOW)).toBe('1 hari lalu');
    expect(timeAgo(ago(5 * 24 * 60 * 60_000), NOW)).toBe('5 hari lalu');
    expect(timeAgo(ago(40 * 24 * 60 * 60_000), NOW)).toBe('1 bulan lalu');
    expect(timeAgo(ago(400 * 24 * 60 * 60_000), NOW)).toBe('1 tahun lalu');
  });

  it('input kosong atau tidak valid -> string kosong', () => {
    expect(timeAgo('', NOW)).toBe('');
    expect(timeAgo('bukan-tanggal', NOW)).toBe('');
    expect(timeAgo('2026-13-45T99:00:00Z', NOW)).toBe('');
  });

  it('timestamp masa depan -> baru saja', () => {
    expect(timeAgo(new Date(NOW.getTime() + 5 * 60_000).toISOString(), NOW)).toBe('baru saja');
  });

  it('default now = waktu saat ini', () => {
    expect(timeAgo(new Date(Date.now() - 120_000).toISOString())).toBe('2 menit lalu');
  });
});
