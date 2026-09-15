export const formatRupiah = (val: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(val);
};

export const formatNumber = (val: number): string => {
  return new Intl.NumberFormat('id-ID').format(val);
};

export const formatWeight = (val: number): string => {
  return `${val.toFixed(1)} kg`;
};

export const getTodayDisplayDate = (): string => {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

export const getTodayISODate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const ID_MONTHS_MAP: Record<string, string> = {
  jan: '01',
  feb: '02',
  mar: '03',
  apr: '04',
  mei: '05',
  may: '05',
  jun: '06',
  jul: '07',
  agu: '08',
  aug: '08',
  sep: '09',
  okt: '10',
  oct: '10',
  nov: '11',
  des: '12',
  dec: '12'
};

export const ID_MONTH_NAMES = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

/**
 * Normalizes any date string ('15 Sep 2026', '15/09/2026', '2026-09-15', ISO string) to YYYY-MM-DD.
 */
export const normalizeToISODate = (dateStr?: string, fallbackIso?: string): string => {
  if (!dateStr && fallbackIso) {
    return fallbackIso.slice(0, 10);
  }
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  
  // 1. Check if YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }

  // 2. Check if DD/MM/YYYY or DD-MM-YYYY
  if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{4}/.test(trimmed)) {
    const parts = trimmed.split(/[\/\-]/);
    const d = parts[0].padStart(2, '0');
    const m = parts[1].padStart(2, '0');
    const y = parts[2];
    return `${y}-${m}-${d}`;
  }

  // 3. Format: '15 Sep 2026' or '15-Sep-2026'
  const parts = trimmed.split(/[\s-]+/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const monthKey = parts[1].slice(0, 3).toLowerCase();
    const month = ID_MONTHS_MAP[monthKey] || '01';
    const year = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
    if (/^\d{4}$/.test(year) && /^\d{2}$/.test(day)) {
      return `${year}-${month}-${day}`;
    }
  }

  // 4. Fallback try Date parsing
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  if (fallbackIso && /^\d{4}-\d{2}-\d{2}/.test(fallbackIso)) {
    return fallbackIso.slice(0, 10);
  }

  return '';
};

/**
 * Returns formatted DD/MM/YYYY string for operational table/sheet display.
 */
export const formatDateDDMMYYYY = (dateStr?: string, fallbackIso?: string): string => {
  const iso = normalizeToISODate(dateStr, fallbackIso);
  if (!iso || iso.length < 10) return dateStr || '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

/**
 * Extract month and year info for monthly worksheet grouping.
 */
export const getMonthYearInfo = (dateStr?: string, fallbackIso?: string): {
  year: number;
  monthIndex: number;
  label: string;
  key: string;
} => {
  const iso = normalizeToISODate(dateStr, fallbackIso) || getTodayISODate();
  const [yearStr, monthStr] = iso.split('-');
  const year = parseInt(yearStr, 10) || new Date().getFullYear();
  const monthNum = parseInt(monthStr, 10) || 1;
  const monthIndex = Math.max(0, Math.min(11, monthNum - 1));
  const label = `${ID_MONTH_NAMES[monthIndex]} ${year}`;
  const key = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;
  return { year, monthIndex, label, key };
};
