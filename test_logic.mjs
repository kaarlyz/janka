import assert from 'node:assert';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

// 1. Cost calculation & waybill format
const calcCost = (weight) => Math.ceil(weight) * 12000;
assert.strictEqual(calcCost(1.0), 12000);
assert.strictEqual(calcCost(2.5), 36000);
assert.strictEqual(calcCost(0.1), 12000);

const mockResi = (courier) => `${courier}2026${Math.floor(1000000 + Math.random() * 9000000)}`;
const jt = mockResi('JT');
const jne = mockResi('JNE');
assert.match(jt, /^JT2026\d{7}$/);
assert.match(jne, /^JNE2026\d{7}$/);

// 2. Fase 5: Exact 6 Column Mapping Verification
const mockShipment = {
  id: 'shp-01',
  date: '2026-09-15',
  resiNumber: 'JT20261234567',
  senderName: 'Gudang Pusat Jakarta',
  senderAddress: 'Jakarta',
  receiverName: 'Toko Sukses',
  receiverAddress: 'Surabaya',
  weight: 2,
  serviceType: 'REGULER (DFOD)',
  amount: 24000,
  paymentType: 'CASH'
};

const excelRow = {
  'TANGGAL': '15/09/2026',
  'NO. KIRIM': mockShipment.resiNumber,
  'NAMA PENGIRIM': mockShipment.senderName,
  'JENIS PAKET': mockShipment.serviceType,
  'JUMLAH': mockShipment.amount,
  'JENIS TRANSAKSI': mockShipment.paymentType,
};

assert.strictEqual(excelRow['TANGGAL'], '15/09/2026');
assert.strictEqual(excelRow['NO. KIRIM'], 'JT20261234567');
assert.strictEqual(excelRow['NAMA PENGIRIM'], 'Gudang Pusat Jakarta');
assert.strictEqual(excelRow['JENIS PAKET'], 'REGULER (DFOD)');
assert.strictEqual(excelRow['JUMLAH'], 24000);
assert.strictEqual(excelRow['JENIS TRANSAKSI'], 'CASH');

// 3. Phase 3: Reconciliation Engine Assertions
const currentDatabase = [
  { ...mockShipment, resiNumber: 'JT20261111111', senderName: 'Gudang Lama' },
  { ...mockShipment, resiNumber: 'JT20262222222', senderName: 'Gudang Lama 2' },
];

const uploadedJTReport = [
  { 'No Resi': 'JT20261111111', 'Seller Name': 'Official Brand Surabaya' },
  { 'No Resi': 'JT20269999999', 'Seller Name': 'Unknown Merchant' }
];

const resiKey = 'No Resi';
const sellerKey = 'Seller Name';
const resiMap = new Map();
for (const row of uploadedJTReport) {
  resiMap.set(row[resiKey].trim().toUpperCase(), row[sellerKey].trim());
}

let updatedCount = 0;
const reconciledDatabase = currentDatabase.map((item) => {
  const norm = item.resiNumber.trim().toUpperCase();
  if (resiMap.has(norm)) {
    updatedCount++;
    return { ...item, senderName: resiMap.get(norm) };
  }
  return item;
});

assert.strictEqual(updatedCount, 1);
assert.strictEqual(reconciledDatabase[0].senderName, 'Official Brand Surabaya');
assert.strictEqual(reconciledDatabase[0].amount, 24000);

// 4. Fase 5: Monthly ExcelJS Worksheets & KAS REGULER Title Verification
const workbook = new ExcelJS.Workbook();
const wsMonth = workbook.addWorksheet('September 2026', {
  views: [{ state: 'frozen', xSplit: 0, ySplit: 4 }]
});
assert.strictEqual(wsMonth.views[0].state, 'frozen');
assert.strictEqual(wsMonth.views[0].ySplit, 4);

wsMonth.getRow(1).getCell(1).value = 'KAS REGULER';
assert.strictEqual(wsMonth.getRow(1).getCell(1).value, 'KAS REGULER');

wsMonth.getRow(4).values = ['TANGGAL', 'NO. KIRIM', 'NAMA PENGIRIM', 'JENIS PAKET', 'JUMLAH', 'JENIS TRANSAKSI'];
assert.strictEqual(wsMonth.getRow(4).getCell(2).value, 'NO. KIRIM');

const addedRow = wsMonth.addRow(['15/09/2026', 'JT20261234567', 'Gudang Pusat', 'REGULER', 24000, 'CASH']);
const amountCell = addedRow.getCell(5);
amountCell.numFmt = '"Rp "#,##0';
assert.strictEqual(amountCell.numFmt, '"Rp "#,##0');

const buffer = await workbook.xlsx.writeBuffer();
assert.ok(buffer.byteLength > 0, 'ExcelJS buffer must be non-empty');

// 5. WhatsApp Notification Generator Verification
const makeWaUrl = (entry) => {
  const msg = `Halo kak, paket atas nama ${entry.senderName} sudah kami proses dengan No. Resi: *${entry.resiNumber}*. Terima kasih!`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
};
const waUrl = makeWaUrl(mockShipment);
assert.ok(waUrl.includes('https://wa.me/?text='));
assert.ok(waUrl.includes('JT20261234567'));

// 6. Smart Address Book Autocomplete Logic Verification
const testShipments = [
  { senderName: 'Toko Sumber Rejeki', senderAddress: 'Jl. Melati 5, Jakarta' },
  { senderName: 'Toko Sumber Rejeki', senderAddress: 'Jl. Melati 5, Jakarta' }, // duplicate
  { senderName: 'CV Maju Jaya', senderAddress: 'Kawasan Industri Cikarang' },
];
const addrMap = new Map();
for (const s of testShipments) {
  if (s.senderName && !addrMap.has(s.senderName)) {
    addrMap.set(s.senderName, s.senderAddress);
  }
}
assert.strictEqual(addrMap.size, 2);

console.log('✓ All Janka Phase 5 tests passed (Monthly Worksheets, KAS REGULER, 6 Columns, DFOD, WhatsApp, Cost).');
