# JANKA — Petty Cash Logistik

Aplikasi pencatatan petty cash pengiriman paket: input manifest, cetak resi
thermal, rekonsiliasi, dan export Excel siap arsip.

## Fitur

- **Entry manifest** — Tanggal, No. Kirim (resi otomatis), Nama Pengirim
  (+ address book), Jenis Paket (REGULER / REGULER DFOD), Jumlah (tarif
  otomatis per-kg, bisa dioverride), Jenis Transaksi (CASH / BCA / BRI / MANDIRI)
- **Data Label** — Nama/alamat penerima + berat, khusus untuk cetak resi
- **Cetak resi thermal** 100x150mm dengan barcode
- **Dashboard** — Total paket, total nominal, rata-rata, breakdown per kurir
- **Filter & sortir** — Rentang tanggal, kurir, kolom
- **Rekonsiliasi** — Import XLSX harian kurir, cocokkan No. Resi otomatis
- **Export Excel** — Worksheet per bulan (`September 2026`, dst.), judul
  KAS REGULER, 6 kolom persis format operasional, baris TOTAL (SUM),
  landscape fit-to-page. File: `janka-petty-cash-YYYY-MM-DD.xlsx`
- **Edit + hapus** entri (hapus pakai konfirmasi)

## Tarif default (bisa diubah di Rate Settings)

| Kurir | Rp/kg |
| ----- | ----- |
| JT    | 12.000 |
| JNE   | 10.000 |

## Jalanin lokal

```bash
npm install
npm run dev      # http://127.0.0.1:5173
npm run build    # output dist/
node test_logic.mjs
```

## Stack

React 18 + Vite 5 + Tailwind 3 + TypeScript. Excel: exceljs (export),
xlsx (import). Data tersimpan di localStorage (`janka_shipments_v1`).
