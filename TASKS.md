# Janka — Papan Tugas & Backlog Pengembangan

 Dokumen lacak tugas dan arah backlog operasional aplikasi Janka.

---

## 📋 Papan Tugas (Task Board)

| Status | Task | Owner | Hasil |
| :---: | :--- | :---: | :--- |
| **Done** | Baseline build & ekstraksi arsitektur modul (`components/`, `hooks/`, `lib/`) | agy | Build hijau 0 error, refactor `App.tsx` monolithic menjadi struktur komponen modular yang rapi. |
| **Done** | Implementasi Fase 5: ExcelJS 6 kolom sheet-bulanan, `reconcileAll` full-dataset, & design system paper-logistics | agy | Export `KAS REGULER` dengan formula `=SUM()`, rekonsiliasi tanpa filter barrier, dan `DESIGN.MD.md` diperbarui. |
| **Done** | Cleanup dependensi mati `framer-motion` & pembaruan dokumentasi baku | agy | Package `framer-motion` di-uninstall, ukuran bundle JS mengecil, build produksi 100% lulus. |
| **Next** | Code-splitting bundle (mengurangi main bundle 1.5MB) via React `lazy()` & dynamic import `exceljs`/`xlsx` | agy | Memisahkan vendor chunk heavy `exceljs` dan `xlsx` agar initial page load lebih cepat (< 200KB). |

---

## 📌 Catatan Pelaksanaan & Backlog Masa Depan

1. **Optimasi Bundle (Next Priority):** Pustaka `exceljs` dan `xlsx` mengambil porsi terbesar dari bundle JS dist. Menggunakan dynamic `import()` saat tombol Export atau Reconcile diklik akan memangkas beban awal aplikasi secara signifikan.
2. **Offline Web Storage Backup:** Menambahkan fitur konfirmasi backup/restore JSON cepat untuk mencegah kehilangan data saat browser clearing `localStorage`.
