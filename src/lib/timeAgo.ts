const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Label waktu relatif bahasa Indonesia, mis. "3 menit lalu".
 * Murni: berikan `now` untuk hasil deterministik (test / render ulang berkala).
 * Input kosong atau tidak valid -> string kosong (pemanggil menyembunyikan elemen).
 * Timestamp masa depan -> "baru saja".
 *
 * ponytail: tanpa Intl.RelativeTimeFormat — outputnya sama ("3 menit lalu"),
 * pakai Intl kalau nanti butuh locale lain.
 */
export function timeAgo(iso: string, now: Date = new Date()): string {
  const timestamp = Date.parse(iso);
  if (!iso || Number.isNaN(timestamp)) return '';

  const diff = now.getTime() - timestamp;
  if (diff < MINUTE) return 'baru saja';

  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} menit lalu`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} jam lalu`;
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)} hari lalu`;
  if (diff < 365 * DAY) return `${Math.floor(diff / (30 * DAY))} bulan lalu`;
  return `${Math.floor(diff / (365 * DAY))} tahun lalu`;
}
