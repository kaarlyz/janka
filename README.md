# JANKA — Petty Cash & Manifest Logistik

JANKA adalah aplikasi web untuk operasional petty cash pengiriman paket harian:
mencatat manifest, mencetak resi thermal, merekonsiliasi laporan kurir, dan
menghasilkan arsip Excel yang siap audit.

Dibangun untuk counter/gudang yang memproses puluhan paket per hari dan butuh
catatan kas yang rapi tanpa software akuntansi yang berat.

---

## Daftar Isi

- [Fitur](#fitur)
- [Alur kerja harian](#alur-kerja-harian)
- [Format Excel](#format-excel)
- [Tarif](#tarif)
- [Menjalankan lokal](#menjalankan-lokal)
- [Struktur proyek](#struktur-proyek)
- [Data & privasi](#data--privasi)
- [Stack](#stack)

## Fitur

| Area | Isi |
| ---- | --- |
| Entry manifest | Tanggal, No. Kirim otomatis, pengirim + address book, Jenis Paket (REGULER / REGULER DFOD), Jumlah auto-tarif (bisa override), Jenis Transaksi (CASH / BCA / BRI / MANDIRI) |
| Data label | Nama/alamat penerima + berat di panel lipat, khusus untuk cetak resi |
| Cetak resi | Label thermal 100x150mm dengan barcode |
| Dashboard | Total paket, total nominal, rata-rata per kg, breakdown per kurir |
| Filter & sortir | Rentang tanggal, kurir, sortir kolom |
| Rekonsiliasi | Import XLSX harian kurir, pencocokan No. Resi otomatis dengan preview |
| Export Excel | Worksheet per bulan, judul KAS REGULER, 6 kolom operasional, baris TOTAL (SUM), landscape fit-to-page |
| Kelola data | Edit entri, hapus dengan konfirmasi |

## Alur kerja harian

1. **Pagi** — Buka app, cek dashboard sisa kemarin bila perlu.
2. **Tiap paket datang** — Isi form (pengirim → penerima → berat), klik
   generate: No. Kirim terbit, nominal kehitung dari tarif, data tersimpan.
3. **Cetak resi** — Buka entri, cetak label thermal, tempel ke paket.
4. **Malam** — Import file XLSX kurir via Rekonsiliasi untuk cek No. Resi
   yang belum cocok, lalu Export Excel untuk arsip.

## Format Excel

Setiap bulan mendapat worksheet sendiri (`September 2026`, dst.):

- Judul grup **KAS REGULER** + periode di baris atas
- Kolom persis: `TANGGAL | NO. KIRIM | NAMA PENGIRIM | JENIS PAKET | JUMLAH | JENIS TRANSAKSI`
- Tanggal `dd/mm/yyyy`, Jumlah format `Rp` rata kanan
- Baris **TOTAL** memakai formula `SUM` asli (tetap hidup di Excel)
- Freeze header, repeat header tiap halaman cetak
- Nama file: `janka-petty-cash-YYYY-MM-DD.xlsx`

## Tarif

Tarif default per kilogram, bisa diubah di Rate Settings:

| Kurir | Rp/kg |
| ----- | ----- |
| JT    | 12.000 |
| JNE   | 10.000 |

Nominal per entri selalu bisa dioverride manual (misal paket DFOD / harga khusus).

## Menjalankan lokal

Prasyarat: Node.js 18+.

```bash
npm install
npm run dev      # dev server di http://127.0.0.1:5173
npm run build    # build produksi ke dist/
node test_logic.mjs   # self-test logika (Excel, tarif, rekonsiliasi)
```

## Struktur proyek

```text
src/
  App.tsx               # shell + layout dua kolom
  components/           # EntryForm, LedgerTable, FilterBar, DashboardSummary,
                        # PrintLabelDialog, ReconcileDialog, DeleteConfirmDialog,
                        # RateSettingsDialog
  hooks/useShipments.ts # state + persistensi localStorage
  lib/excel.ts          # export workbook sheet-bulanan (exceljs)
  lib/formatters.ts     # Rupiah, tanggal, resi
  types.ts              # model ShipmentEntry
test_logic.mjs          # self-test tanpa runner
```

## Data & privasi

Seluruh data tersimpan lokal di browser (`localStorage` kunci
`janka_shipments_v1`). Tidak ada akun, server, atau telemetri — file Excel
yang diekspor adalah satu-satunya data yang keluar dari aplikasi.

## Stack

React 18 · Vite 5 · Tailwind CSS 3 · TypeScript · exceljs (export) ·
xlsx (import). Tanpa backend, tanpa database.
