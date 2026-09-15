# Janka — Comprehensive Technical Context Document

> **Classification:** Project Architectural Blueprint & Operational Memory  
> **Target Audience:** Autonomous Coding Agents & Large Language Models  
> **Source of Truth:** Repository Implementation Codebase (`/home/vallencia/Documents/janka`)  
> **Primary Storage / State:** `localStorage` (`janka_shipments_v1`, `janka_rates_v1`)

---

## 1. PRODUCT OVERVIEW

### 1.1 What is Janka?
**Janka** adalah aplikasi web operasional *light paper-logistics ledger* & *petty cash system* yang dirancang khusus untuk gudang, counter pengiriman, dan admin logistik. Aplikasi ini memproses puluhan paket harian dengan memfasilitasi pencatatan manifest pengiriman, pencetakan resi thermal (100x150mm), rekonsiliasi data kurir otomatis, serta penciptaan arsip laporan kas bulanan format Excel (`KAS REGULER`) yang siap audit.

### 1.2 Problems Solved
1. **Manual Paperwork Bottlenecks:** Menghilangkan pencatatan tangan di buku besar fisik dengan stasiun input manifest cepat berbasis autocomplete pengirim.
2. **Thermal Label Generation:** Menyediakan dialog cetak resi standar logistik (100x150mm) lengkap dengan pola barcode SVG tanpa bergantung pada printer driver berbayar.
3. **Discrepancy in Courier Reports:** Memfasilitasi rekonsiliasi laporan XLSX harian dari kurir (misal J&T) untuk mencocokkan nomor resi dan mengupdate data pengirim secara otomatis.
4. **Audit-Ready Financial Exports:** Menghasilkan workbook ExcelJS multi-worksheet per bulan dengan 6 kolom operasional baku, formula `=SUM()` aktif, serta tata letak cetak landscape fit-to-page.

---

## 2. TECH STACK

- **Frontend Framework:** React 18.3 (`react`, `react-dom`)
- **Language:** TypeScript 5.6 (strict type checking)
- **Build Tool & Dev Server:** Vite 5.4 (`@vitejs/plugin-react`)
- **Styling:** Tailwind CSS 3.4 dengan sistem desain Light Paper-Logistics (radius 2px–4px, tanpa rounded-full pills)
- **Excel & File Processing:**
  - `exceljs` (^4.4.0): Generator file Excel (.xlsx) 6 kolom dengan sheet bulanan & formula native.
  - `xlsx` SheetJS (^0.18.5): Parser file spreadsheet kurir untuk fitur rekonsiliasi.
- **Icons:** `lucide-react` (^0.460.0)
- **Architecture:** 100% Client-Side Single Page Application (SPA), zero backend/database, zero telemetri.

---

## 3. REPOSITORY MAP & MODULE ARCHITECTURE

```text
janka/
├── CONTEXT.md                  # Dokumen konteks teknis & arsitektur (File ini)
├── TASKS.md                    # Papan status & backlog tugas proyek
├── DESIGN.MD.md                # Panduan design system Light Paper-Logistics
├── README.md                   # Dokumentasi publik & panduan penggunaan
├── package.json                # Dependensi & skrip npm
├── vite.config.ts              # Konfigurasi bundler Vite
├── test_logic.mjs              # Script self-test logika (Excel, tarif, rekonsiliasi)
└── src/
    ├── App.tsx                 # Shell aplikasi & layout 2-kolom fluid (1600px)
    ├── main.tsx                # Entry point mounting React DOM
    ├── types.ts                # Definisikan model ShipmentEntry, CourierRateConfig, FilterState
    ├── components/             # Komponen UI modular
    │   ├── EntryForm.tsx       # Form stasiun input manifest & kalkulator tarif
    │   ├── LedgerTable.tsx     # Tabel data manifest dengan sorting & seleksi entri
    │   ├── FilterBar.tsx       # Filter pencarian, kurir, & rentang tanggal
    │   ├── DashboardSummary.tsx# Ringkasan metrik (total paket, nominal, avg Rp/kg, breakdown)
    │   ├── PrintLabelDialog.tsx# Dialog render & cetak label thermal 100x150mm
    │   ├── ReconcileDialog.tsx # Dialog upload & preview rekonsiliasi XLSX kurir
    │   ├── RateSettingsDialog.tsx # Modal pengaturan tarif per kg (JT & JNE)
    │   └── DeleteConfirmDialog.tsx # Modal konfirmasi hapus entri
    ├── hooks/
    │   └── useShipments.ts     # Hook utama: state, persistence localStorage, CRUD, reconcileAll
    └── lib/
        ├── excel.ts            # Engine export Premium ExcelJS (6 kolom, sheet bulanan, SUM)
        └── formatters.ts       # Utility format Rupiah, tanggal DD/MM/YYYY, ISO date normalization
```

---

## 4. DATA MODEL & LOCAL STORAGE KEY

### 4.1 Interface `ShipmentEntry` (`src/types.ts`)
```typescript
export interface ShipmentEntry {
  id: string;             // Unique ID ('shp-{timestamp}-{rand}')
  date: string;           // Tanggal tampilan ('15 Sep 2026')
  resiNumber: string;     // Nomor resi / waybill ('JT2026782910')
  senderName: string;     // Nama pengirim paket
  senderAddress: string;  // Alamat pengirim
  receiverName: string;   // Nama penerima
  receiverAddress: string;// Alamat penerima
  weight: number;         // Berat dalam kg (misal: 2.5)
  serviceType: string;    // Jenis paket ('J&T - Reguler', 'JNE - Reguler')
  amount: number;         // Nominal biaya / petty cash (Rp)
  paymentType: string;    // Jenis transaksi ('Petty Cash', 'CASH', 'BCA', dll)
  createdAt?: string;     // ISO Timestamp ('2026-09-15T08:00:00.000Z')
}
```

### 4.2 Storage Keys & Fallback Mechanics (`src/hooks/useShipments.ts`)
- **`janka_shipments_v1`**: Key `localStorage` menyimpan array `ShipmentEntry[]`.
  - *Fallback Corrupt Data*: Jika `JSON.parse` gagal atau data korup, `useShipments` secara otomatis melakukan normalisasi tipe data atau fallback ke `INITIAL_SHIPMENTS`.
- **`janka_rates_v1`**: Key `localStorage` menyimpan konfigurasi tarif kurir `CourierRateConfig`.
  - *Fallback Corrupt Data*: Jika tidak ada atau invalid, fallback ke `DEFAULT_RATES`.

---

## 5. DEFAULT RATES & CALCULATION LOGIC

### 5.1 Tarif Default (`DEFAULT_RATES`)
| Kurir Code | Nama Kurir | Tarif Default per kg | Logic Pembulatan Berat |
| :--- | :--- | :--- | :--- |
| **JT** | J&T Express | **Rp 12.000 / kg** | `Math.max(1, Math.ceil(weight))` |
| **JNE** | JNE Express | **Rp 10.000 / kg** | `Math.max(1, Math.ceil(weight))` |

- **Formula Kalkulasi:**  
  $$\text{Nominal} = \text{Math.max}(1, \text{Math.ceil}(\text{weight})) \times \text{TarifKurir}$$
- **Manual Override:** Nominal hasil kalkulasi otomatis selalu dapat di-override manual pada form `EntryForm.tsx` (misalnya untuk pengiriman paket DFOD / tarif khusus).

---

## 6. OPERATIONAL WORKFLOWS

### 6.1 Alur Cetak Resi (`PrintLabelDialog.tsx`)
1. User memilih entri pada `LedgerTable.tsx` dan mengklik **Cetak Resi**.
2. Modul `PrintLabelDialog` merender permukaan label thermal ukuran standar **100x150mm**.
3. Komponen menghasilkan elemen barcode SVG pattern dari `resiNumber`.
4. Memicu dialog cetak browser (`window.print()`) dengan CSS print layout khusus `@media print` yang mengisolasi area label.

### 6.2 Alur Rekonsiliasi Kurir (`ReconcileDialog.tsx` & `reconcileAll`)
1. User mengunggah file spreadsheet laporan kurir (`.xlsx` / `.xls`).
2. `ReconcileDialog` membaca file menggunakan pustaka `xlsx` (SheetJS) dan mengekstrak pasangan `[No. Resi, Nama Pengirim]`.
3. Menampilkan preview perbandingan entri yang cocok (`Matched`) dan belum cocok.
4. Saat dikonfirmasi, mengesksekusi fungsi `reconcileAll(resiMap)` pada `useShipments.ts`.
5. **Penting:** `reconcileAll` mengupdate seluruh dataset `shipments` di `localStorage` tanpa terhalang oleh filter UI (`startDate`, `endDate`, atau `courier`).

### 6.3 Alur Export Excel (`lib/excel.ts`)
1. User mengklik **Export Excel** pada header aplikasi.
2. `exportPremiumExcel(shipments)` mengelompokkan seluruh entri berdasarkan bulan & tahun (`YYYY-MM`).
3. Membuat **1 worksheet per bulan** (misal: `"September 2026"`, `"Agustus 2026"`).
4. Merender header block **KAS REGULER** pada baris 1 & 2.
5. Menyusun **6 Kolom Eksak** pada baris 4:
   `[TANGGAL | NO. KIRIM | NAMA PENGIRIM | JENIS PAKET | JUMLAH | JENIS TRANSAKSI]`
6. Menuliskan data dengan format angka Rupiah (`"Rp "#,##0`) pada kolom `JUMLAH` (Cell E).
7. Menambahkan baris **TOTAL KAS REGULER** dengan formula native Excel `=SUM(E5:E{n})`.
8. Mengatur tampilan cetak *landscape*, *fit-to-page*, *freeze pane* baris 4, serta repeating header saat dicetak.
9. Mengunduh file dengan format nama `janka-petty-cash-YYYY-MM-DD.xlsx`.

---

## 7. AI HANDOFF & ARCHITECTURAL INVARIANTS

Saat melanjutkan pengembangan atau melakukan refactoring pada codebase ini, setiap agent AI **wajib mematuhi invariant teknis berikut**:

1. **Integritas Spesifikasi 6 Kolom Excel:** Kolom export Excel di `lib/excel.ts` harus persis 6 kolom (`TANGGAL`, `NO. KIRIM`, `NAMA PENGIRIM`, `JENIS PAKET`, `JUMLAH`, `JENIS TRANSAKSI`). Jangan menambah atau mengubah urutan kolom ini tanpa koordinasi.
2. **Formula Total Excel Native:** Baris total pada setiap worksheet Excel harus selalu menggunakan formula native `=SUM(...)` pada sel angka agar nilai dinamis tetap berfungsi saat dibuka di Microsoft Excel.
3. **Kunci LocalStorage Imutabel:** Key `janka_shipments_v1` dan `janka_rates_v1` tidak boleh diubah nama atau strukturnya tanpa mekanisme migrasi data otomatis.
4. **Rekonsiliasi Bebas Barrier Filter (`reconcileAll`):** Proses rekonsiliasi harus selalu mengeksekusi update terhadap seluruh array `shipments` pada level hook, bukan sekadar data terfilter di layar.
5. **Design System Paper-Logistics (Antislop UI):**
   - Latar belakang bersih `#FFFFFF` / canvas `#F5F6F8` dengan border `#D5D9E0`.
   - Radius komponen wajib 2px–4px. **Dilarang menggunakan `rounded-full` pills** pada tombol, card, badge, atau modal (kecuali titik status circular 2px).
   - Bahasa operasional Indonesia yang lugas dan profesional, tanpa jargon marketing.
6. **Pembulatan Berat Tarif:** Kalkulasi tarif default wajib memakai `Math.ceil(weight)` dengan batas minimal 1 kg (`Math.max(1, ...)`).
7. **Normalisasi Tanggal Deterministik:** Semua pemrosesan tanggal wajib melalui fungsi helper `normalizeToISODate` & `formatDateDDMMYYYY` pada `lib/formatters.ts` untuk menjamin konsistensi antara tampilan tabel dan hasil cetak/export.
