---
version: "janka-light-paper-logistics-v5"
name: "Janka Logistics & Petty Cash Ledger System"
description: "High-density light paper-logistics ledger design system. Engineered for fast parcel manifest entry, expedition rate calculation, thermal shipping label printing, and 6-column monthly petty cash auditing."
colors:
  primary: "#1E293B"
  secondary: "#475569"
  accent: "#2563EB"
  background: "#F5F6F8"
  surface: "#FFFFFF"
  text-primary: "#0F172A"
  text-secondary: "#64748B"
  border: "#D5D9E0"
  status-success: "#16A34A"
  status-error: "#EF4444"
  status-warning: "#F59E0B"
typography:
  display-lg:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "18px"
    fontWeight: 700
    lineHeight: "1.2"
  body-md:
    fontFamily: "Inter, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 400
    lineHeight: "1.5"
  label-mono:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 600
    lineHeight: "1.2"
spacing:
  base: "4px"
  gap: "12px"
  card-padding: "16px"
  section-padding: "20px"
rounded:
  card: "3px"
  control: "2px"
  pill: "none (strictly 2px-4px crisp border radius, no rounded-full pills except 2px status dots)"
architecture:
  components: "src/components/ (EntryForm, LedgerTable, FilterBar, DashboardSummary, PrintLabelDialog, ReconcileDialog, RateSettingsDialog, DeleteConfirmDialog)"
  hooks: "src/hooks/ (useShipments)"
  lib: "src/lib/ (excel.ts, formatters.ts)"
---
# Janka Light Paper-Logistics Ledger System

## Overview
Janka is an operational logistics ledger for warehouse managers, shipping admins, and logistics auditors. The UI adopts a **light paper-logistics aesthetic**: clean white surface `#FFFFFF`, canvas `#F5F6F8`, crisp borders `#D5D9E0`, and dark slate typography `#0F172A`.

## Core Visual Invariants (Antislop UI)
1. **Light Paper Theme**: No pitch-black `#000000` dark modes, no purple-blue gradients, no hero cards, and no decorative glow.
2. **Crisp Radius (2px–4px)**: Buttons, inputs, tables, cards, and badges use strict 2px–3px border radii. **No `rounded-full` pills** are allowed on buttons, cards, or badges (only 2px circular status dots are permitted).
3. **Operational Typography**: Clean sans-serif for UI labels paired with tabular monospace for waybill numbers (`NO. KIRIM`), transaction amounts, weights (`kg`), and timestamps.
4. **Restrained Operational Copy**: Indonesian operational language (`"Stasiun Input Manifest"`, `"Kas Reguler"`, `"Cetak Label Thermal"`, `"Rekonsiliasi J&T"`). Zero marketing fluff or emojis.

## Layout & Widescreen Architecture (2K Fluid Layout)
- **Fluid Widescreen Container**: Uses `max-w-[1600px] w-full mx-auto` to utilize 2560x1440 and 1080p screens efficiently.
- **Two-Column Split (`xl`/`2xl`)**:
  - **Left Column (`aside w-[420px] sticky top-14`)**: Sticky input station ([`EntryForm.tsx`](file:///home/vallencia/Documents/janka/src/components/EntryForm.tsx)) allowing rapid manifest logging while keeping table context in view.
  - **Right Column (`section flex-1 min-w-0`)**: Summary metrics, filter controls, and compact ledger table.

## Modular Code Structure
- **`src/components/`**: Modular UI components ([`EntryForm.tsx`](file:///home/vallencia/Documents/janka/src/components/EntryForm.tsx), [`LedgerTable.tsx`](file:///home/vallencia/Documents/janka/src/components/LedgerTable.tsx), [`FilterBar.tsx`](file:///home/vallencia/Documents/janka/src/components/FilterBar.tsx), [`DashboardSummary.tsx`](file:///home/vallencia/Documents/janka/src/components/DashboardSummary.tsx), [`PrintLabelDialog.tsx`](file:///home/vallencia/Documents/janka/src/components/PrintLabelDialog.tsx), [`ReconcileDialog.tsx`](file:///home/vallencia/Documents/janka/src/components/ReconcileDialog.tsx), [`RateSettingsDialog.tsx`](file:///home/vallencia/Documents/janka/src/components/RateSettingsDialog.tsx), [`DeleteConfirmDialog.tsx`](file:///home/vallencia/Documents/janka/src/components/DeleteConfirmDialog.tsx)).
- **`src/hooks/`**: Custom data hook ([`useShipments.ts`](file:///home/vallencia/Documents/janka/src/hooks/useShipments.ts)) managing `janka_shipments_v1`, `janka_rates_v1`, CRUD operations, corrupt JSON fallbacks, and full-dataset reconciliation.
- **`src/lib/`**: Business logic, formatting, and ExcelJS exporter ([`excel.ts`](file:///home/vallencia/Documents/janka/src/lib/excel.ts), [`formatters.ts`](file:///home/vallencia/Documents/janka/src/lib/formatters.ts)).

## Excel Sheet Specification (Kas Reguler)
- **Exact 6 Columns**: `[TANGGAL | NO. KIRIM | NAMA PENGIRIM | JENIS PAKET | JUMLAH | JENIS TRANSAKSI]`.
- **Monthly Worksheets**: One worksheet per month present in the dataset (e.g. `"September 2026"`, `"Agustus 2026"`). Months without entries do not produce empty worksheets.
- **Title Block**: Header row 1 titled `"KAS REGULER"` with subtitle period label.
- **Formula Totals**: Native Excel `=SUM(...)` total row per sheet for column `JUMLAH`.
- **Print Setup**: Landscape, fit-to-page, repeating header row 4, filename `janka-petty-cash-YYYY-MM-DD.xlsx`.