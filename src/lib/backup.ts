import { ShipmentEntry, CourierRateConfig } from '../types';
import { formatDateDDMMYYYY, normalizeToISODate } from './formatters';

export interface JankaBackupPayload {
  version: number;
  exportedAt: string;
  rates: CourierRateConfig;
  shipments: ShipmentEntry[];
}

export interface BackupValidationSuccess {
  valid: true;
  payload: JankaBackupPayload;
  summary: {
    count: number;
    dateRange: string;
    exportedAtDisplay: string;
    ratesDisplay: string;
  };
}

export interface BackupValidationFailure {
  valid: false;
  error: string;
}

export type BackupValidationResult = BackupValidationSuccess | BackupValidationFailure;

/**
 * Validates the contents of a JSON backup file.
 * Returns structured validation result with preview metadata if valid.
 */
export function validateBackupJSON(rawText: string): BackupValidationResult {
  if (!rawText || !rawText.trim()) {
    return { valid: false, error: 'File backup kosong.' };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(rawText);
  } catch (err) {
    return { valid: false, error: 'File backup tidak dapat dibaca: format JSON korup atau rusak.' };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { valid: false, error: 'File backup tidak valid: struktur JSON harus berupa objek utama.' };
  }

  // Version check (must be version 1)
  if (typeof parsed.version !== 'number' || parsed.version !== 1) {
    const versionLabel = parsed.version !== undefined ? String(parsed.version) : 'tidak ada';
    return {
      valid: false,
      error: `Versi format backup tidak dikenal (versi ${versionLabel}). Aplikasi ini hanya mendukung format backup versi 1.`,
    };
  }

  // Shipments check
  if (!Array.isArray(parsed.shipments)) {
    return { valid: false, error: 'File backup tidak valid: properti "shipments" harus berupa daftar manifest.' };
  }

  // Validate shipment entries
  const shipments: ShipmentEntry[] = [];
  for (let i = 0; i < parsed.shipments.length; i++) {
    const item = parsed.shipments[i];
    if (!item || typeof item !== 'object') {
      return { valid: false, error: `Entri manifest ke-${i + 1} tidak valid (bukan objek).` };
    }
    if (typeof item.resiNumber !== 'string' || !item.resiNumber.trim()) {
      return { valid: false, error: `Entri manifest ke-${i + 1} tidak memiliki nomor resi yang valid.` };
    }

    // Normalize item to ensure full type safety
    shipments.push({
      id: typeof item.id === 'string' ? item.id : `shp-restored-${Date.now()}-${i}`,
      date: typeof item.date === 'string' ? item.date : '15 Sep 2026',
      resiNumber: String(item.resiNumber).trim().toUpperCase(),
      senderName: typeof item.senderName === 'string' ? item.senderName : 'Pengirim',
      senderAddress: typeof item.senderAddress === 'string' ? item.senderAddress : '',
      receiverName: typeof item.receiverName === 'string' ? item.receiverName : 'Penerima',
      receiverAddress: typeof item.receiverAddress === 'string' ? item.receiverAddress : '',
      weight: typeof item.weight === 'number' && !isNaN(item.weight) ? item.weight : parseFloat(item.weight) || 1.0,
      serviceType: typeof item.serviceType === 'string' ? item.serviceType : 'J&T - Reguler',
      amount: typeof item.amount === 'number' && !isNaN(item.amount) ? item.amount : parseInt(item.amount, 10) || 10000,
      paymentType: typeof item.paymentType === 'string' ? item.paymentType : 'Petty Cash',
      createdAt: typeof item.createdAt === 'string' ? item.createdAt : new Date().toISOString(),
    });
  }

  // Rates check
  const rates: CourierRateConfig = {
    JT: parsed.rates && typeof parsed.rates.JT === 'number' ? parsed.rates.JT : 12000,
    JNE: parsed.rates && typeof parsed.rates.JNE === 'number' ? parsed.rates.JNE : 10000,
  };

  // Compute date range preview
  let dateRange = 'Tidak ada data';
  if (shipments.length > 0) {
    const isoDates = shipments
      .map((s) => normalizeToISODate(s.date, s.createdAt))
      .filter(Boolean)
      .sort();

    if (isoDates.length > 0) {
      const minDate = formatDateDDMMYYYY(isoDates[0]);
      const maxDate = formatDateDDMMYYYY(isoDates[isoDates.length - 1]);
      dateRange = minDate === maxDate ? minDate : `${minDate} s/d ${maxDate}`;
    }
  }

  let exportedAtDisplay = 'Tidak tercantum';
  if (typeof parsed.exportedAt === 'string') {
    try {
      const expDate = new Date(parsed.exportedAt);
      if (!isNaN(expDate.getTime())) {
        exportedAtDisplay = expDate.toLocaleString('id-ID', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {
      exportedAtDisplay = parsed.exportedAt;
    }
  }

  const ratesDisplay = `J&T: Rp ${rates.JT.toLocaleString('id-ID')} / kg • JNE: Rp ${rates.JNE.toLocaleString('id-ID')} / kg`;

  return {
    valid: true,
    payload: {
      version: 1,
      exportedAt: parsed.exportedAt || new Date().toISOString(),
      rates,
      shipments,
    },
    summary: {
      count: shipments.length,
      dateRange,
      exportedAtDisplay,
      ratesDisplay,
    },
  };
}

/**
 * Triggers browser download for JSON backup file janka-backup-YYYY-MM-DD.json
 */
export function exportBackupJSON(shipments: ShipmentEntry[], rates: CourierRateConfig): void {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const fileDate = `${year}-${month}-${day}`;

  const payload: JankaBackupPayload = {
    version: 1,
    exportedAt: now.toISOString(),
    rates,
    shipments,
  };

  const jsonString = JSON.stringify(payload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `janka-backup-${fileDate}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
