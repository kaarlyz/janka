import ExcelJS from 'exceljs';
import { ShipmentEntry } from '../types';
import { formatDateDDMMYYYY, getMonthYearInfo } from './formatters';

export interface ExcelExportOptions {
  filenameDate?: string;
}

/**
 * Upgraded Operational ExcelJS Export (Janka Fase 5)
 * - 6 Exact Columns: [TANGGAL | NO. KIRIM | NAMA PENGIRIM | JENIS PAKET | JUMLAH | JENIS TRANSAKSI]
 * - Grouped by month: 1 worksheet PER MONTH (e.g., 'September 2026', 'Agustus 2026')
 * - Header title block: 'KAS REGULER' + month period
 * - Total row with native Excel SUM formula per sheet
 * - Freeze header at row 4
 * - Landscape fit-to-page print setup with repeating header
 * - Filename: janka-petty-cash-YYYY-MM-DD.xlsx
 */
export async function exportPremiumExcel(
  shipments: ShipmentEntry[],
  options: ExcelExportOptions = {}
): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Janka Logistics Engine';
  workbook.created = new Date();

  // 1. Group shipments by month key ('YYYY-MM')
  const monthMap = new Map<string, { label: string; key: string; entries: ShipmentEntry[] }>();

  for (const item of shipments) {
    const info = getMonthYearInfo(item.date, item.createdAt);
    if (!monthMap.has(info.key)) {
      monthMap.set(info.key, {
        label: info.label,
        key: info.key,
        entries: [],
      });
    }
    monthMap.get(info.key)!.entries.push(item);
  }

  // Sort month keys chronologically ascending (or fallback to single default sheet if empty)
  const sortedMonthKeys = Array.from(monthMap.keys()).sort((a, b) => a.localeCompare(b));

  if (sortedMonthKeys.length === 0) {
    const todayInfo = getMonthYearInfo();
    monthMap.set(todayInfo.key, {
      label: todayInfo.label,
      key: todayInfo.key,
      entries: [],
    });
    sortedMonthKeys.push(todayInfo.key);
  }

  // 2. Build one Worksheet PER MONTH
  for (const monthKey of sortedMonthKeys) {
    const monthGroup = monthMap.get(monthKey)!;
    const sheetName = monthGroup.label.slice(0, 31); // Max 31 chars for Excel sheet name

    const worksheet = workbook.addWorksheet(sheetName, {
      views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }],
      pageSetup: {
        orientation: 'landscape',
        fitToPage: true,
        fitToWidth: 1,
        fitToHeight: 0,
        paperSize: 9, // A4
        margins: {
          left: 0.4,
          right: 0.4,
          top: 0.5,
          bottom: 0.5,
          header: 0.3,
          footer: 0.3,
        },
      },
    });

    // Repeat header row 4 when printed
    worksheet.pageSetup.printTitlesRow = '4:4';

    // ── ROW 1: Title "KAS REGULER" ──
    worksheet.mergeCells('A1:F1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = 'KAS REGULER';
    titleCell.font = { name: 'Calibri', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).height = 28;

    // ── ROW 2: Subtitle Period ──
    worksheet.mergeCells('A2:F2');
    const subTitleCell = worksheet.getCell('A2');
    subTitleCell.value = `Periode: ${monthGroup.label} | Janka Logistics Petty Cash Ledger`;
    subTitleCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF475569' } };
    subTitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    subTitleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(2).height = 20;

    // ── ROW 3: Blank separator ──
    worksheet.getRow(3).height = 10;

    // ── ROW 4: Table Headers (6 exact columns) ──
    const headers = ['TANGGAL', 'NO. KIRIM', 'NAMA PENGIRIM', 'JENIS PAKET', 'JUMLAH', 'JENIS TRANSAKSI'];
    const headerRow = worksheet.getRow(4);
    headerRow.height = 24;

    headers.forEach((h, colIdx) => {
      const cell = headerRow.getCell(colIdx + 1);
      cell.value = h;
      cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      cell.alignment = {
        vertical: 'middle',
        horizontal: colIdx === 4 ? 'right' : 'left',
      };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FF334155' } },
        right: { style: 'thin', color: { argb: 'FF334155' } },
      };
    });

    // ── DATA ROWS ──
    let startRow = 5;
    monthGroup.entries.forEach((item, idx) => {
      const rowNum = startRow + idx;
      const row = worksheet.getRow(rowNum);
      row.height = 20;

      const dateDisplay = formatDateDDMMYYYY(item.date, item.createdAt);

      row.getCell(1).value = dateDisplay;
      row.getCell(2).value = item.resiNumber;
      row.getCell(3).value = item.senderName;
      row.getCell(4).value = item.serviceType || 'REGULER';

      const amountCell = row.getCell(5);
      amountCell.value = Number(item.amount) || 0;
      amountCell.numFmt = '"Rp "#,##0';

      row.getCell(6).value = item.paymentType || 'CASH';

      const isEven = idx % 2 === 0;
      const bgArgb = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

      for (let c = 1; c <= 6; c++) {
        const cell = row.getCell(c);
        cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.alignment = {
          vertical: 'middle',
          horizontal: c === 5 ? 'right' : 'left',
        };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        };
      }
    });

    const endRow = startRow + monthGroup.entries.length - 1;
    const totalRowIndex = Math.max(startRow, endRow + 1);

    // ── TOTAL ROW PER SHEET ──
    const totalRow = worksheet.getRow(totalRowIndex);
    totalRow.height = 24;

    worksheet.mergeCells(`A${totalRowIndex}:D${totalRowIndex}`);
    const labelTotalCell = worksheet.getCell(`A${totalRowIndex}`);
    labelTotalCell.value = `TOTAL KAS REGULER (${monthGroup.label}):`;
    labelTotalCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    labelTotalCell.alignment = { vertical: 'middle', horizontal: 'right' };

    const sumCell = worksheet.getCell(`E${totalRowIndex}`);
    if (monthGroup.entries.length > 0) {
      sumCell.value = { formula: `=SUM(E5:E${endRow})`, result: monthGroup.entries.reduce((a, b) => a + (Number(b.amount) || 0), 0) };
    } else {
      sumCell.value = 0;
    }
    sumCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    sumCell.numFmt = '"Rp "#,##0';
    sumCell.alignment = { vertical: 'middle', horizontal: 'right' };

    const endCell = worksheet.getCell(`F${totalRowIndex}`);
    endCell.value = '';

    for (let c = 1; c <= 6; c++) {
      const cell = totalRow.getCell(c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
      cell.border = {
        top: { style: 'medium', color: { argb: 'FF0F172A' } },
        bottom: { style: 'double', color: { argb: 'FF0F172A' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      };
    }

    // Explicit Column Widths
    worksheet.getColumn(1).width = 14; // TANGGAL
    worksheet.getColumn(2).width = 18; // NO. KIRIM
    worksheet.getColumn(3).width = 32; // NAMA PENGIRIM
    worksheet.getColumn(4).width = 20; // JENIS PAKET
    worksheet.getColumn(5).width = 20; // JUMLAH
    worksheet.getColumn(6).width = 20; // JENIS TRANSAKSI
  }

  // ── WRITE TO FILE DOWNLOAD ──
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });

  const now = new Date();
  const fileDate =
    options.filenameDate ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const filename = `janka-petty-cash-${fileDate}.xlsx`;

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(link);
}

/**
 * CSV fallback export (6 exact columns)
 */
export function exportToCSV(shipments: ShipmentEntry[], filenameDate?: string): void {
  const headers = ['TANGGAL', 'NO. KIRIM', 'NAMA PENGIRIM', 'JENIS PAKET', 'JUMLAH', 'JENIS TRANSAKSI'];
  const rows = shipments.map((s) => [
    formatDateDDMMYYYY(s.date, s.createdAt),
    s.resiNumber,
    `"${s.senderName.replace(/"/g, '""')}"`,
    `"${s.serviceType.replace(/"/g, '""')}"`,
    s.amount,
    `"${s.paymentType.replace(/"/g, '""')}"`,
  ]);
  const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  const now = new Date();
  const fileDate =
    filenameDate ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `janka-petty-cash-${fileDate}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
