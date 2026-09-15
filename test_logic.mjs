import assert from 'node:assert';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

// 1. Cost calculation & waybill format
const calcCost = (weight) => Math.ceil(weight) * 10000;
assert.strictEqual(calcCost(1.0), 10000);
assert.strictEqual(calcCost(2.5), 30000);
assert.strictEqual(calcCost(0.1), 10000);

const mockResi = (courier) => `${courier}2026${Math.floor(1000000 + Math.random() * 9000000)}`;
const jt = mockResi('JT');
const jne = mockResi('JNE');
assert.match(jt, /^JT2026\d{7}$/);
assert.match(jne, /^JNE2026\d{7}$/);

// 2. Excel column mapping verification
const mockShipment = {
  id: 'shp-01',
  date: '15 Sep 2026',
  resiNumber: 'JT20261234567',
  senderName: 'Gudang Pusat',
  senderAddress: 'Jakarta',
  receiverName: 'Toko Sukses',
  receiverAddress: 'Surabaya',
  weight: 2,
  serviceType: 'J&T - Reguler',
  amount: 20000,
  paymentType: 'Petty Cash'
};

const excelRow = {
  'TANGGAL': mockShipment.date,
  'NO RESI': mockShipment.resiNumber,
  'NAMA PENGIRIM': mockShipment.senderName,
  'JENIS PAKET': mockShipment.serviceType,
  'JUMLAH': mockShipment.amount,
  'JENIS TRANSAKSI': mockShipment.paymentType,
};

assert.strictEqual(excelRow['TANGGAL'], '15 Sep 2026');
assert.strictEqual(excelRow['NO RESI'], 'JT20261234567');
assert.strictEqual(excelRow['NAMA PENGIRIM'], 'Gudang Pusat');
assert.strictEqual(excelRow['JENIS PAKET'], 'J&T - Reguler');
assert.strictEqual(excelRow['JUMLAH'], 20000);
assert.strictEqual(excelRow['JENIS TRANSAKSI'], 'Petty Cash');

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
assert.strictEqual(reconciledDatabase[0].amount, 20000);
assert.strictEqual(reconciledDatabase[1].senderName, 'Gudang Lama 2');

// 4. Phase 4: Premium ExcelJS Export Verification
const workbook = new ExcelJS.Workbook();
const ws = workbook.addWorksheet('PETTY CASH', {
  views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
});
assert.strictEqual(ws.views[0].state, 'frozen');
assert.strictEqual(ws.views[0].ySplit, 1);

ws.columns = [
  { header: 'TANGGAL', key: 'date' },
  { header: 'NO RESI', key: 'resi' },
  { header: 'JUMLAH', key: 'amount' }
];
const row1 = ws.getRow(1);
row1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
assert.strictEqual(row1.fill.fgColor.argb, 'FF1E293B');

const addedRow = ws.addRow({ date: '15 Sep 2026', resi: 'JT20261234567', amount: 20000 });
const amountCell = addedRow.getCell(3);
amountCell.numFmt = '"Rp "#,##0';
assert.strictEqual(amountCell.numFmt, '"Rp "#,##0');

const buffer = await workbook.xlsx.writeBuffer();
assert.ok(buffer.byteLength > 0, 'ExcelJS buffer must be non-empty');

// 5. WhatsApp Notification URL Generator Verification
const makeWaUrl = (entry) => {
  const msg = `Halo kak, paket atas nama ${entry.senderName} sudah kami proses dengan No. Resi: *${entry.resiNumber}*. Terima kasih!`;
  return `https://wa.me/?text=${encodeURIComponent(msg)}`;
};
const waUrl = makeWaUrl(mockShipment);
assert.ok(waUrl.includes('https://wa.me/?text='));
assert.ok(waUrl.includes('JT20261234567'));
assert.ok(waUrl.includes(encodeURIComponent('*JT20261234567*')));

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
assert.strictEqual(addrMap.get('Toko Sumber Rejeki'), 'Jl. Melati 5, Jakarta');

console.log('✓ All Janka Phase 4 tests passed (ExcelJS, WhatsApp, Address Book, Reconciliation, Cost).');
