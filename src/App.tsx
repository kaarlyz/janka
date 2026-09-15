import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ExcelJS from 'exceljs';
import * as XLSX from 'xlsx';
import { 
  Package, 
  TableProperties, 
  ArrowUpRight, 
  Loader2, 
  Boxes, 
  ReceiptText, 
  Scale, 
  Truck, 
  Download, 
  Printer, 
  X, 
  FileSpreadsheet, 
  QrCode, 
  UploadCloud, 
  RefreshCw, 
  FileCheck2, 
  AlertCircle,
  MessageCircle,
  BookUser,
  Search,
  Check
} from 'lucide-react';
import { ShipmentEntry } from './types';

const STORAGE_KEY = 'janka_shipments_v1';

// Initial seed records
const INITIAL_SHIPMENTS: ShipmentEntry[] = [
  {
    id: 'shp-01',
    date: '15 Sep 2026',
    resiNumber: 'JT2026782910',
    senderName: 'Gudang Pusat Jakarta',
    senderAddress: 'Jl. Daan Mogot No. 45, Jakarta Barat',
    receiverName: 'PT Maju Bersama',
    receiverAddress: 'Jl. Pemuda No. 12, Semarang',
    weight: 2.5,
    serviceType: 'J&T - Reguler',
    amount: 30000,
    paymentType: 'Petty Cash'
  },
  {
    id: 'shp-02',
    date: '15 Sep 2026',
    resiNumber: 'JNE2026491823',
    senderName: 'Divisi Logistik JKT',
    senderAddress: 'Kawasan Industri Pulogadung, Jakarta Timur',
    receiverName: 'Klinik Sehat Utama',
    receiverAddress: 'Jl. Riau No. 88, Bandung',
    weight: 1.0,
    serviceType: 'JNE - Reguler',
    amount: 10000,
    paymentType: 'Petty Cash'
  }
];

// SVG Barcode Component for authentic thermal shipping labels
function BarcodePattern({ code }: { code: string }) {
  const bars = Array.from(code).flatMap((char, i) => {
    const n = char.charCodeAt(0) % 5;
    return [
      { width: 2 + (n % 3), gap: 2 + ((n + i) % 2) },
      { width: 1 + (n % 2), gap: 2 + (i % 3) },
      { width: 3 - (n % 2), gap: 1 + (n % 2) },
    ];
  });

  let currentX = 10;
  return (
    <svg className="w-full h-12" viewBox="0 0 320 50" preserveAspectRatio="none">
      {bars.map((bar, idx) => {
        const x = currentX;
        currentX += bar.width + bar.gap;
        if (x > 310) return null;
        return <rect key={idx} x={x} y={2} width={bar.width} height={46} fill="#000000" />;
      })}
    </svg>
  );
}

export default function App() {
  // Mobile responsive segment controller
  const [mobileTab, setMobileTab] = useState<'entry' | 'ledger'>('entry');
  
  // Data Persistence (Local Storage)
  const [shipments, setShipments] = useState<ShipmentEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('Failed to load shipments from localStorage', err);
    }
    return INITIAL_SHIPMENTS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shipments));
    } catch (err) {
      console.error('Failed to save shipments to localStorage', err);
    }
  }, [shipments]);

  // Operational States
  const [isLoading, setIsLoading] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const [lastGeneratedEntry, setLastGeneratedEntry] = useState<ShipmentEntry | null>(null);
  const [selectedForPrint, setSelectedForPrint] = useState<ShipmentEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Reconciliation States
  const [isReconcileOpen, setIsReconcileOpen] = useState(false);
  const [reconcileFeedback, setReconcileFeedback] = useState<string | null>(null);
  const [reconcilePreview, setReconcilePreview] = useState<{
    totalRows: number;
    matchedCount: number;
    resiColumn: string;
    sellerColumn: string;
    sampleMatches: { resi: string; oldSeller: string; newSeller: string }[];
    rawData: Record<string, any>[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [senderName, setSenderName] = useState('Gudang Pusat Logistik');
  const [senderAddress, setSenderAddress] = useState('Jl. Cakung Cilincing Km. 4, Jakarta Timur');
  const [receiverName, setReceiverName] = useState('');
  const [receiverAddress, setReceiverAddress] = useState('');
  const [weight, setWeight] = useState<string>('1.0');
  const [courier, setCourier] = useState<'JT' | 'JNE'>('JT');
  const [paymentType, setPaymentType] = useState('Petty Cash');

  // Address Book Autocomplete State
  const [isSenderDropdownOpen, setIsSenderDropdownOpen] = useState(false);

  // Derive unique senders from past shipments
  const addressBook = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of shipments) {
      if (s.senderName?.trim() && !map.has(s.senderName.trim())) {
        map.set(s.senderName.trim(), s.senderAddress?.trim() || '');
      }
    }
    return Array.from(map.entries()).map(([name, address]) => ({ name, address }));
  }, [shipments]);

  const filteredSenders = useMemo(() => {
    const query = senderName.trim().toLowerCase();
    if (!query) return addressBook;
    return addressBook.filter(s => s.name.toLowerCase().includes(query));
  }, [addressBook, senderName]);

  // Filtered queue based on live search
  const displayedShipments = useMemo(() => {
    if (!searchQuery.trim()) return shipments;
    const q = searchQuery.toLowerCase().trim();
    return shipments.filter(s => 
      s.resiNumber.toLowerCase().includes(q) ||
      s.senderName.toLowerCase().includes(q) ||
      s.receiverName.toLowerCase().includes(q)
    );
  }, [shipments, searchQuery]);

  // Metrics
  const totalShipments = shipments.length;
  const totalAmount = shipments.reduce((acc, curr) => acc + curr.amount, 0);
  const totalWeight = shipments.reduce((acc, curr) => acc + curr.weight, 0);

  const formatRupiah = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val);
  };

  const handleGenerateResi = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedWeight = parseFloat(weight);
    if (!receiverName.trim() || isNaN(parsedWeight) || parsedWeight <= 0) {
      alert('Mohon lengkapi nama penerima dan berat paket yang valid.');
      return;
    }

    setIsLoading(true);

    // Simulated carrier API handshake delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Generate Resi Number
    const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
    const newResi = `${courier}2026${randomSuffix}`;
    const calculatedAmount = Math.ceil(parsedWeight) * 10000;

    const now = new Date();
    const dateFormatted = now.toLocaleDateString('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });

    const newEntry: ShipmentEntry = {
      id: `shp-${Date.now()}`,
      date: dateFormatted,
      resiNumber: newResi,
      senderName: senderName.trim() || 'Logistics Admin',
      senderAddress: senderAddress.trim() || 'Warehouse Hub',
      receiverName: receiverName.trim(),
      receiverAddress: receiverAddress.trim() || '-',
      weight: parsedWeight,
      serviceType: `${courier === 'JT' ? 'J&T' : 'JNE'} - Reguler`,
      amount: calculatedAmount,
      paymentType
    };

    setShipments((prev) => [newEntry, ...prev]);
    setLastGeneratedEntry(newEntry);
    setIsLoading(false);

    // Reset receiver fields ready for next package
    setReceiverName('');
    setReceiverAddress('');
    setWeight('1.0');
  };

  // PREMIUM EXCEL EXPORT (Using ExcelJS)
  const handleExportPremiumExcel = async () => {
    try {
      setIsExportingExcel(true);
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Janka Logistics Engine';
      workbook.created = new Date();

      const worksheet = workbook.addWorksheet('PETTY CASH', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
      });

      worksheet.columns = [
        { header: 'TANGGAL', key: 'date' },
        { header: 'NO RESI', key: 'resi' },
        { header: 'NAMA PENGIRIM', key: 'sender' },
        { header: 'NAMA PENERIMA', key: 'receiver' },
        { header: 'BERAT (KG)', key: 'weight' },
        { header: 'JENIS PAKET', key: 'service' },
        { header: 'JUMLAH', key: 'amount' },
        { header: 'JENIS TRANSAKSI', key: 'payment' },
      ];

      const headerRow = worksheet.getRow(1);
      headerRow.height = 26;
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FF1E293B' },
        };
        cell.font = {
          name: 'Inter',
          color: { argb: 'FFFFFFFF' },
          bold: true,
          size: 10,
        };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        cell.border = {
          top: { style: 'thin', color: { argb: 'FF94A3B8' } },
          left: { style: 'thin', color: { argb: 'FF94A3B8' } },
          bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } },
          right: { style: 'thin', color: { argb: 'FF94A3B8' } },
        };
      });

      shipments.forEach((s) => {
        const row = worksheet.addRow({
          date: s.date,
          resi: s.resiNumber,
          sender: s.senderName,
          receiver: s.receiverName,
          weight: s.weight,
          service: s.serviceType,
          amount: s.amount,
          payment: s.paymentType,
        });

        row.height = 20;

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
            right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          };
          cell.font = { name: 'Inter', size: 9.5 };
          cell.alignment = { vertical: 'middle', horizontal: 'left' };

          if (colNumber === 1 || colNumber === 6 || colNumber === 8) {
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
          }

          if (colNumber === 2) {
            cell.font = { name: 'Consolas', size: 9.5, bold: true };
          }

          if (colNumber === 5) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.numFmt = '#,##0.0" kg"';
          }

          if (colNumber === 7) {
            cell.alignment = { vertical: 'middle', horizontal: 'right' };
            cell.font = { name: 'Consolas', size: 9.5, bold: true };
            cell.numFmt = '"Rp "#,##0';
          }
        });
      });

      worksheet.columns.forEach((column) => {
        let maxLength = 0;
        if (column.header) {
          maxLength = column.header.toString().length;
        }
        column.eachCell?.({ includeEmpty: true }, (cell) => {
          const cellVal = cell.value ? cell.value.toString() : '';
          if (cellVal.length > maxLength) {
            maxLength = cellVal.length;
          }
        });
        column.width = Math.max(maxLength + 4, 13);
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Janka_PettyCash_${new Date().toISOString().slice(0, 10)}.xlsx`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export premium Excel:', err);
      alert('Terjadi kesalahan saat mengekspor Excel.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  // WHATSAPP NOTIFICATION GENERATOR
  const handleSendWhatsApp = (entry: ShipmentEntry) => {
    const rawMessage = `Halo kak, paket atas nama ${entry.senderName} sudah kami proses dengan No. Resi: *${entry.resiNumber}*. Terima kasih!`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(rawMessage)}`;
    window.open(waUrl, '_blank');
  };

  // CSV Fallback export
  const exportToCSV = () => {
    const headers = ['Date', 'No. Resi', 'Sender Name', 'Receiver Name', 'Weight (kg)', 'Service Type', 'Amount (Rp)', 'Payment Type'];
    const rows = shipments.map(s => [
      s.date,
      s.resiNumber,
      `"${s.senderName.replace(/"/g, '""')}"`,
      `"${s.receiverName.replace(/"/g, '""')}"`,
      s.weight,
      s.serviceType,
      s.amount,
      s.paymentType
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Janka_PettyCash_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reconciliation Engine
  const parseReconcileFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonRows.length === 0) {
        alert('File Excel kosong atau tidak terbaca.');
        return;
      }

      const sampleRow = jsonRows[0];
      const allKeys = Object.keys(sampleRow);
      
      const resiKey = allKeys.find(k => /resi|waybill|awb|no|tracking/i.test(k)) || allKeys[0];
      const sellerKey = allKeys.find(k => /seller|pengirim|sender|shipper|toko|merchant/i.test(k)) || 
        allKeys.find(k => k !== resiKey) || allKeys[1] || allKeys[0];

      const resiMap = new Map<string, string>();
      for (const row of jsonRows) {
        const rVal = String(row[resiKey] || '').trim().toUpperCase();
        const sVal = String(row[sellerKey] || '').trim();
        if (rVal && sVal) {
          resiMap.set(rVal, sVal);
        }
      }

      const sampleMatches: { resi: string; oldSeller: string; newSeller: string }[] = [];
      let matchedCount = 0;

      for (const s of shipments) {
        const normResi = s.resiNumber.trim().toUpperCase();
        if (resiMap.has(normResi)) {
          matchedCount++;
          if (sampleMatches.length < 5) {
            sampleMatches.push({
              resi: s.resiNumber,
              oldSeller: s.senderName,
              newSeller: resiMap.get(normResi)!
            });
          }
        }
      }

      setReconcilePreview({
        totalRows: jsonRows.length,
        matchedCount,
        resiColumn: resiKey,
        sellerColumn: sellerKey,
        sampleMatches,
        rawData: jsonRows
      });
    } catch (err) {
      console.error('Reconciliation parse error:', err);
      alert('Gagal memproses file Excel. Pastikan format file adalah .xlsx atau .csv.');
    }
  };

  const applyReconciliation = () => {
    if (!reconcilePreview) return;

    const { resiColumn, sellerColumn, rawData } = reconcilePreview;
    const resiMap = new Map<string, string>();
    for (const row of rawData) {
      const rVal = String(row[resiColumn] || '').trim().toUpperCase();
      const sVal = String(row[sellerColumn] || '').trim();
      if (rVal && sVal) {
        resiMap.set(rVal, sVal);
      }
    }

    let updatedCount = 0;
    const updatedShipments = shipments.map((item) => {
      const normResi = item.resiNumber.trim().toUpperCase();
      if (resiMap.has(normResi)) {
        const newSeller = resiMap.get(normResi)!;
        if (newSeller !== item.senderName) {
          updatedCount++;
          return {
            ...item,
            senderName: newSeller
          };
        }
      }
      return item;
    });

    setShipments(updatedShipments);
    setIsReconcileOpen(false);
    setReconcilePreview(null);
    setReconcileFeedback(`${updatedCount} Records Reconciled & Updated`);
    setTimeout(() => setReconcileFeedback(null), 5000);
  };

  const downloadSampleJTReport = () => {
    const sampleRows = shipments.slice(0, 3).map((s, idx) => ({
      'No Resi': s.resiNumber,
      'Seller Name': `Official Store ${idx === 0 ? 'Surabaya Central' : 'Jakarta Hub'}`,
      'Status': 'Delivered',
      'Destination': s.receiverAddress || 'Jawa'
    }));

    sampleRows.push({
      'No Resi': 'JT20269999999',
      'Seller Name': 'External Merchant XYZ',
      'Status': 'In Transit',
      'Destination': 'Medan'
    });

    const ws = XLSX.utils.json_to_sheet(sampleRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'JT_DAILY_REPORT');
    XLSX.writeFile(wb, 'Sample_JT_Nightly_Report.xlsx');
  };

  return (
    <div className="min-h-screen w-full bg-[#000000] text-white flex flex-col font-sans antialiased selection:bg-zinc-800 selection:text-white">
      
      {/* PERSISTENT TOP APP BAR (Operational & Shift Status) */}
      <header className="no-print w-full px-6 py-4 border-b border-[#CBD5E1]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#000000] sticky top-0 z-50">
        
        {/* Brand & Shift Indicator */}
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-[8px] bg-zinc-800 border border-zinc-700 flex items-center justify-center">
            <Boxes className="h-4 w-4 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold tracking-wider text-sm uppercase text-white">JANKA</span>
              <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-[4px] text-[10px] font-mono bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>SHIFT ACTIVE</span>
              </span>
            </div>
            <p className="text-[11px] text-zinc-400">Logistics Operations Desk</p>
          </div>
        </div>

        {/* Shift Financial & Count Metrics + Batch Actions */}
        <div className="flex items-center flex-wrap gap-2">
          
          {/* Live Glanceable Metrics Pill */}
          <div className="flex items-center space-x-3 bg-zinc-900 border border-zinc-800 rounded-[8px] px-3 py-1.5 text-xs">
            <div className="flex items-center space-x-1.5">
              <Package className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-zinc-400">Today:</span>
              <strong className="font-mono text-white">{totalShipments}</strong>
            </div>
            <div className="h-3 w-px bg-zinc-700" />
            <div className="flex items-center space-x-1.5">
              <Scale className="h-3.5 w-3.5 text-zinc-400" />
              <span className="text-zinc-400">Weight:</span>
              <strong className="font-mono text-white">{totalWeight.toFixed(1)} kg</strong>
            </div>
            <div className="h-3 w-px bg-zinc-700" />
            <div className="flex items-center space-x-1.5">
              <ReceiptText className="h-3.5 w-3.5 text-emerald-400" />
              <span className="text-zinc-400">Petty Cash:</span>
              <strong className="font-mono text-emerald-400">{formatRupiah(totalAmount)}</strong>
            </div>
          </div>

          {/* Shift Actions */}
          <button
            onClick={() => setIsReconcileOpen(true)}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-[8px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 hover:border-blue-500/50 text-xs font-medium text-zinc-200 transition"
            title="Upload nightly J&T report to auto-sync seller names"
          >
            <RefreshCw className="h-3.5 w-3.5 text-blue-400" />
            <span>Auto-Match J&amp;T</span>
          </button>

          <button
            disabled={isExportingExcel}
            onClick={handleExportPremiumExcel}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-[8px] bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-sm transition disabled:opacity-50"
            title="Export formatted Petty Cash spreadsheet with frozen headers & native currency"
          >
            {isExportingExcel ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5" />
            )}
            <span>Export (.xlsx)</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="no-print flex-1 w-full p-6 space-y-6">
        
        {/* Reconcile Toast Feedback */}
        <AnimatePresence>
          {reconcileFeedback && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3 rounded-[8px] bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 flex items-center justify-between text-xs shadow-md"
            >
              <div className="flex items-center space-x-2">
                <FileCheck2 className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="font-semibold font-mono">[ {reconcileFeedback} ]</span>
                <span className="text-zinc-400 text-[11px]">— Database synchronized with J&amp;T report.</span>
              </div>
              <button 
                onClick={() => setReconcileFeedback(null)} 
                className="text-zinc-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile / Tablet Segment Controller (< 1024px) */}
        <div className="lg:hidden flex items-center p-1 rounded-[8px] bg-zinc-900 border border-zinc-800 text-xs">
          <button
            onClick={() => setMobileTab('entry')}
            className={`flex-1 py-1.5 rounded-[6px] font-medium transition ${
              mobileTab === 'entry'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            Package Entry Station
          </button>
          <button
            onClick={() => setMobileTab('ledger')}
            className={`flex-1 py-1.5 rounded-[6px] font-medium transition flex items-center justify-center space-x-1.5 ${
              mobileTab === 'ledger'
                ? 'bg-white text-black font-semibold shadow-sm'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            <span>Dispatch Ledger</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-zinc-800 text-zinc-300">
              {totalShipments}
            </span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* OPERATIONAL WORKBENCH (DUAL-PANE ON DESKTOP, TOGGLEABLE ON MOBILE) */}
        {/* ========================================================================= */}
        <div className="grid grid-cols-1 gap-6 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
          
          {/* ----------------------------------------------------------------------- */}
          {/* PANE 1 (LEFT, 4/3 COLS): FAST PACKAGE ENTRY STATION */}
          {/* ----------------------------------------------------------------------- */}
          <div className={`lg:col-span-4 xl:col-span-3 ${mobileTab === 'entry' ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-[#0F0F12] border border-zinc-800 rounded-[12px] p-5 space-y-4">
              
              {/* Station Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center space-x-2">
                  <Truck className="h-4 w-4 text-zinc-400" />
                  <h2 className="text-xs font-bold uppercase tracking-wider text-white">Package Input Station</h2>
                </div>
                <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-[4px]">
                  NEW RESI ENTRY
                </span>
              </div>

              <form onSubmit={handleGenerateResi} className="space-y-3.5">
                
                {/* 1. Partner Toggle */}
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5 uppercase tracking-wide">
                    Courier Partner
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setCourier('JT')}
                      className={`py-2 px-3 text-xs font-semibold rounded-[8px] border transition flex items-center justify-center space-x-2 ${
                        courier === 'JT'
                          ? 'bg-white text-black border-white shadow-sm'
                          : 'bg-[#151518] text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <Truck className="h-3.5 w-3.5" />
                      <span>J&amp;T Express</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setCourier('JNE')}
                      className={`py-2 px-3 text-xs font-semibold rounded-[8px] border transition flex items-center justify-center space-x-2 ${
                        courier === 'JNE'
                          ? 'bg-white text-black border-white shadow-sm'
                          : 'bg-[#151518] text-zinc-400 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <Truck className="h-3.5 w-3.5" />
                      <span>JNE Express</span>
                    </button>
                  </div>
                </div>

                {/* 2. Sender Section with Smart Address Book */}
                <div className="space-y-2 pt-1">
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-medium text-zinc-400 uppercase tracking-wide">
                        Sender (Pengirim)
                      </label>
                      {addressBook.length > 0 && (
                        <span className="text-[10px] font-mono text-zinc-500 flex items-center space-x-1">
                          <BookUser className="h-3 w-3" />
                          <span>{addressBook.length} saved</span>
                        </span>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={senderName}
                      onFocus={() => setIsSenderDropdownOpen(true)}
                      onBlur={() => setTimeout(() => setIsSenderDropdownOpen(false), 200)}
                      onChange={(e) => {
                        setSenderName(e.target.value);
                        setIsSenderDropdownOpen(true);
                      }}
                      placeholder="e.g. Gudang Pusat Jakarta"
                      className="w-full bg-[#151518] border border-zinc-800 focus:border-zinc-500 rounded-[8px] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none transition"
                    />

                    {/* Autocomplete Dropdown */}
                    <AnimatePresence>
                      {isSenderDropdownOpen && filteredSenders.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute z-30 top-full left-0 right-0 mt-1 bg-[#151518] border border-zinc-700 rounded-[8px] shadow-2xl overflow-hidden divide-y divide-zinc-800 backdrop-blur-md"
                        >
                          <div className="px-3 py-1.5 text-[10px] font-mono uppercase text-zinc-400 bg-zinc-900 flex items-center justify-between">
                            <span>Address Book (Click to autofill)</span>
                            <span>{filteredSenders.length} match</span>
                          </div>
                          <div className="max-h-40 overflow-y-auto">
                            {filteredSenders.map((s, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onMouseDown={() => {
                                  setSenderName(s.name);
                                  setSenderAddress(s.address);
                                  setIsSenderDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 hover:bg-zinc-800 transition flex flex-col group"
                              >
                                <span className="text-xs font-semibold text-white group-hover:text-blue-300 transition">
                                  {s.name}
                                </span>
                                <span className="text-[10px] text-zinc-400 truncate">
                                  {s.address}
                                </span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <input
                    type="text"
                    value={senderAddress}
                    onChange={(e) => setSenderAddress(e.target.value)}
                    placeholder="Origin address (Hub / Warehouse)"
                    className="w-full bg-[#151518] border border-zinc-800 focus:border-zinc-500 rounded-[8px] px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none transition"
                  />
                </div>

                <div className="h-px bg-zinc-800/80 my-1" />

                {/* 3. Receiver Section */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1 uppercase tracking-wide">
                      Receiver Name <span className="text-zinc-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={receiverName}
                      onChange={(e) => setReceiverName(e.target.value)}
                      placeholder="e.g. PT Maju Bersama / Bpk. Budi"
                      className="w-full bg-[#151518] border border-zinc-800 focus:border-zinc-500 rounded-[8px] px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none transition"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1 uppercase tracking-wide">
                      Destination Address
                    </label>
                    <textarea
                      rows={2}
                      value={receiverAddress}
                      onChange={(e) => setReceiverAddress(e.target.value)}
                      placeholder="City, District, Destination Street Address"
                      className="w-full bg-[#151518] border border-zinc-800 focus:border-zinc-500 rounded-[8px] px-3 py-1.5 text-xs text-zinc-300 placeholder-zinc-600 focus:outline-none transition resize-none"
                    />
                  </div>
                </div>

                {/* 4. Weight & Payment */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1 uppercase tracking-wide">
                      Weight (kg) <span className="text-zinc-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full font-mono bg-[#151518] border border-zinc-800 focus:border-zinc-500 rounded-[8px] px-3 py-2 text-xs text-white focus:outline-none transition"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1 uppercase tracking-wide">
                      Payment Type
                    </label>
                    <select
                      value={paymentType}
                      onChange={(e) => setPaymentType(e.target.value)}
                      className="w-full bg-[#151518] border border-zinc-800 focus:border-zinc-500 rounded-[8px] px-2.5 py-2 text-xs text-white focus:outline-none transition"
                    >
                      <option value="Petty Cash" className="bg-[#121214] text-white">Petty Cash</option>
                      <option value="Direct Transfer" className="bg-[#121214] text-white">Direct Transfer</option>
                      <option value="Invoice COD" className="bg-[#121214] text-white">Invoice COD</option>
                    </select>
                  </div>
                </div>

                {/* 5. Cost Estimation High-Contrast Box */}
                <div className="p-3 rounded-[8px] bg-zinc-900 border border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-medium text-zinc-400 block uppercase tracking-wide">Calculated Ongkir</span>
                    <span className="text-[10px] text-zinc-500">Tarif Rp 10.000 / kg (round up)</span>
                  </div>
                  <span className="font-mono text-lg font-bold text-emerald-400">
                    {formatRupiah(Math.ceil(parseFloat(weight) || 0) * 10000)}
                  </span>
                </div>

                {/* Primary CTA */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 bg-white hover:bg-zinc-200 text-black font-bold text-xs rounded-[8px] transition flex items-center justify-center space-x-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-black" />
                      <span>Generating Waybill...</span>
                    </>
                  ) : (
                    <>
                      <span>Log Package &amp; Generate Resi</span>
                      <ArrowUpRight className="h-4 w-4 text-black" />
                    </>
                  )}
                </button>
              </form>

              {/* Instant Post-Log Action Banner */}
              <AnimatePresence>
                {lastGeneratedEntry && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-3 rounded-[8px] bg-zinc-900 border border-emerald-500/40 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-1.5 text-emerald-400 font-semibold">
                        <Check className="h-4 w-4" />
                        <span>Logged to Ledger</span>
                      </div>
                      <span className="font-mono font-bold text-white tracking-tight">
                        {lastGeneratedEntry.resiNumber}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 pt-1 border-t border-zinc-800">
                      <button
                        type="button"
                        onClick={() => setSelectedForPrint(lastGeneratedEntry)}
                        className="flex-1 py-1 px-2 rounded-[6px] bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-[11px] flex items-center justify-center space-x-1 transition"
                      >
                        <Printer className="h-3 w-3 text-zinc-300" />
                        <span>Print Thermal Label</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSendWhatsApp(lastGeneratedEntry)}
                        className="flex-1 py-1 px-2 rounded-[6px] bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 font-medium text-[11px] flex items-center justify-center space-x-1 transition"
                      >
                        <MessageCircle className="h-3 w-3 text-emerald-400" />
                        <span>Send WhatsApp</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* PANE 2 (RIGHT, 8/9 COLS): ACTIVE DISPATCH QUEUE & PETTY CASH LEDGER */}
          {/* ----------------------------------------------------------------------- */}
          <div className={`lg:col-span-8 xl:col-span-9 ${mobileTab === 'ledger' ? 'block' : 'hidden lg:block'}`}>
            <div className="bg-[#0F0F12] border border-zinc-800 rounded-[12px] p-5 space-y-4">
              
              {/* Queue Header & Search Filter */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
                <div>
                  <div className="flex items-center space-x-2">
                    <TableProperties className="h-4 w-4 text-zinc-400" />
                    <h2 className="text-xs font-bold uppercase tracking-wider text-white">Active Dispatch Queue</h2>
                  </div>
                  <p className="text-[11px] text-zinc-400">Real-time outgoing packages &amp; petty cash records</p>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative w-full sm:w-48">
                    <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-zinc-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search resi, sender..."
                      className="w-full bg-[#151518] border border-zinc-800 focus:border-zinc-600 rounded-[6px] pl-8 pr-3 py-1.5 text-xs text-white placeholder-zinc-600 focus:outline-none transition"
                    />
                  </div>
                  <button
                    onClick={exportToCSV}
                    className="px-2.5 py-1.5 rounded-[6px] bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-[11px] font-medium text-zinc-300 transition"
                    title="Export raw CSV"
                  >
                    CSV
                  </button>
                </div>
              </div>

              {/* Dense Data Table */}
              <div className="overflow-x-auto rounded-[8px] border border-zinc-800 bg-[#09090B]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 text-[11px] font-medium">
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">No. Resi</th>
                      <th className="py-2.5 px-3">Sender / Seller</th>
                      <th className="py-2.5 px-3">Receiver</th>
                      <th className="py-2.5 px-3 text-right">Kg</th>
                      <th className="py-2.5 px-3">Service</th>
                      <th className="py-2.5 px-3 text-right">Ongkir</th>
                      <th className="py-2.5 px-3 text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {displayedShipments.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-12 text-center text-zinc-500 space-y-1">
                          <Package className="h-6 w-6 mx-auto text-zinc-600 mb-2" />
                          <p className="font-medium text-zinc-400">No shipments found</p>
                          <p className="text-[11px]">
                            {searchQuery ? 'Try matching another query' : 'Enter your first package on the left to begin today\'s shift.'}
                          </p>
                        </td>
                      </tr>
                    ) : (
                      displayedShipments.map((entry) => (
                        <tr 
                          key={entry.id}
                          className="hover:bg-zinc-900/40 transition group"
                        >
                          <td className="py-2 px-3 text-zinc-400 whitespace-nowrap text-[11px]">
                            {entry.date}
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-white whitespace-nowrap tracking-tight">
                            {entry.resiNumber}
                          </td>
                          <td className="py-2 px-3 text-zinc-200 max-w-[130px] truncate" title={entry.senderName}>
                            {entry.senderName}
                          </td>
                          <td className="py-2 px-3 text-zinc-400 max-w-[120px] truncate" title={entry.receiverName}>
                            {entry.receiverName}
                          </td>
                          <td className="py-2 px-3 font-mono text-zinc-300 text-right whitespace-nowrap">
                            {entry.weight}
                          </td>
                          <td className="py-2 px-3 whitespace-nowrap">
                            <span className="inline-block px-1.5 py-0.5 rounded-[4px] bg-zinc-900 border border-zinc-800 text-[10px] font-mono text-zinc-300">
                              {entry.serviceType.includes('J&T') ? 'J&T' : 'JNE'}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-emerald-400 text-right whitespace-nowrap">
                            {formatRupiah(entry.amount)}
                          </td>
                          <td className="py-2 px-3 text-center whitespace-nowrap">
                            <div className="inline-flex items-center space-x-1">
                              <button
                                onClick={() => handleSendWhatsApp(entry)}
                                className="p-1.5 rounded-[6px] bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 border border-emerald-500/30 transition"
                                title="Send WhatsApp Notification"
                              >
                                <MessageCircle className="h-3 w-3" />
                              </button>
                              <button
                                onClick={() => setSelectedForPrint(entry)}
                                className="p-1.5 rounded-[6px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 transition"
                                title="Print Thermal Shipping Label"
                              >
                                <Printer className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Queue Footer Summary */}
              <div className="pt-2 border-t border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-zinc-400 gap-2">
                <span>Showing {displayedShipments.length} of {shipments.length} logged packages</span>
                <div className="flex items-center space-x-4">
                  <span>Total Disbursed: <strong className="font-mono text-emerald-400">{formatRupiah(totalAmount)}</strong></span>
                </div>
              </div>

            </div>
          </div>

        </div>

      </main>

      {/* ========================================================================= */}
      {/* UTILITY MODALS: NIGHTLY RECONCILIATION & THERMAL PRINT PREVIEW */}
      {/* ========================================================================= */}

      {/* 1. NIGHTLY RECONCILIATION MODAL */}
      <AnimatePresence>
        {isReconcileOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-lg bg-[#0F0F12] border border-zinc-700 rounded-[12px] p-5 shadow-2xl my-8 text-white space-y-4"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center space-x-2.5">
                  <div className="p-1.5 rounded-[6px] bg-blue-500/20 border border-blue-400/30">
                    <RefreshCw className="h-4 w-4 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-white">Nightly J&amp;T Reconciliation</h3>
                    <p className="text-[11px] text-zinc-400">Auto-match seller names by Waybill/Resi number</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsReconcileOpen(false);
                    setReconcilePreview(null);
                  }}
                  className="p-1 rounded-[6px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Drag & Drop File Zone */}
              <input 
                type="file" 
                ref={fileInputRef} 
                accept=".xlsx, .xls, .csv" 
                className="hidden" 
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    parseReconcileFile(e.target.files[0]);
                  }
                }} 
              />

              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    parseReconcileFile(e.dataTransfer.files[0]);
                  }
                }}
                className="border-2 border-dashed border-zinc-700 hover:border-zinc-500 hover:bg-zinc-900/50 rounded-[8px] p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 bg-[#151518]"
              >
                <div className="p-2 rounded-full bg-zinc-800 text-zinc-300">
                  <UploadCloud className="h-6 w-6" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    Drop J&amp;T Daily Report (.xlsx / .csv)
                  </p>
                  <p className="text-[11px] text-zinc-400">
                    Click to browse from local computer
                  </p>
                </div>
              </div>

              {/* Template generator helper */}
              <div className="flex items-center justify-between p-2.5 rounded-[6px] bg-zinc-900 border border-zinc-800 text-xs">
                <span className="text-zinc-400 text-[11px]">Need a sample file to test immediately?</span>
                <button
                  onClick={downloadSampleJTReport}
                  className="text-blue-400 hover:text-blue-300 font-mono text-[11px] underline flex items-center space-x-1"
                >
                  <Download className="h-3 w-3" />
                  <span>Download Sample</span>
                </button>
              </div>

              {/* Reconciliation Preview */}
              {reconcilePreview && (
                <div className="space-y-2.5 pt-2 border-t border-zinc-800 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-[6px] bg-blue-950/40 border border-blue-500/30 text-blue-300 font-mono text-[11px]">
                    <span>Found {reconcilePreview.matchedCount} matching waybills</span>
                    <span>{reconcilePreview.matchedCount > 0 ? 'READY TO SYNC' : 'NO MATCHES'}</span>
                  </div>

                  {reconcilePreview.sampleMatches.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] text-zinc-400">Match Preview:</p>
                      <div className="divide-y divide-zinc-800 rounded-[6px] border border-zinc-800 bg-[#151518] overflow-hidden font-mono text-[11px]">
                        {reconcilePreview.sampleMatches.map((m, i) => (
                          <div key={i} className="p-2 flex items-center justify-between">
                            <span className="text-zinc-400">{m.resi}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-red-400 line-through truncate max-w-[110px]">{m.oldSeller}</span>
                              <span className="text-zinc-500">→</span>
                              <span className="text-emerald-400 font-semibold truncate max-w-[130px]">{m.newSeller}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {reconcilePreview.matchedCount === 0 && (
                    <div className="p-2 rounded-[6px] bg-amber-950/40 border border-amber-500/30 text-amber-200 flex items-center space-x-2 text-[11px]">
                      <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />
                      <span>No matching resi found. Data will not be overwritten.</span>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsReconcileOpen(false);
                    setReconcilePreview(null);
                  }}
                  className="px-3 py-1.5 rounded-[6px] bg-zinc-800 hover:bg-zinc-700 text-xs text-white transition"
                >
                  Cancel
                </button>
                <button
                  disabled={!reconcilePreview || reconcilePreview.matchedCount === 0}
                  onClick={applyReconciliation}
                  className="px-3.5 py-1.5 rounded-[6px] bg-white hover:bg-zinc-200 text-black font-semibold text-xs transition disabled:opacity-50"
                >
                  Apply &amp; Update Ledger
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. PRINTABLE RESI / SHIPPING LABEL MODAL */}
      <AnimatePresence>
        {selectedForPrint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-lg bg-[#0F0F12] border border-zinc-700 rounded-[12px] p-5 shadow-2xl my-8 text-white"
            >
              {/* Modal Top Control Bar (Hidden when printing) */}
              <div className="no-print flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
                <div className="flex items-center space-x-2">
                  <QrCode className="h-4 w-4 text-zinc-400" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-white">Thermal Shipping Label</h3>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleSendWhatsApp(selectedForPrint)}
                    className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-[6px] bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 font-semibold text-xs transition"
                  >
                    <MessageCircle className="h-3 w-3" />
                    <span>Send WA</span>
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-[6px] bg-white text-black font-bold text-xs hover:bg-zinc-200 transition"
                  >
                    <Printer className="h-3 w-3" />
                    <span>Print Label</span>
                  </button>
                  <button
                    onClick={() => setSelectedForPrint(null)}
                    className="p-1 rounded-[6px] bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Physical Thermal Shipping Label (Print Isolated) */}
              <div 
                id="shipping-label-card"
                className="bg-white text-black p-5 rounded-[6px] border-2 border-black font-sans shadow-inner selection:bg-black selection:text-white"
              >
                <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="bg-black text-white px-2 py-0.5 text-xs font-black tracking-wider uppercase rounded-sm">
                      {selectedForPrint.serviceType.includes('J&T') ? 'J&T EXPRESS' : 'JNE EXPRESS'}
                    </span>
                    <span className="border border-black px-1.5 py-0.5 text-[10px] font-mono font-bold">
                      EZ / REGULER
                    </span>
                  </div>
                  <div className="text-right font-mono text-xs">
                    <span className="font-bold text-xs block">CGK-HUB01</span>
                    <span className="text-[10px] text-zinc-600">{selectedForPrint.date}</span>
                  </div>
                </div>

                <div className="py-2.5 text-center border-b-2 border-black">
                  <div className="max-w-[260px] mx-auto">
                    <BarcodePattern code={selectedForPrint.resiNumber} />
                  </div>
                  <div className="mt-1 font-mono text-base font-black tracking-widest">
                    {selectedForPrint.resiNumber}
                  </div>
                </div>

                <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black text-xs">
                  <div className="p-2 space-y-0.5">
                    <p className="text-[9px] font-mono font-bold uppercase text-zinc-600">PENGIRIM (SENDER):</p>
                    <p className="font-bold text-zinc-900">{selectedForPrint.senderName}</p>
                    <p className="text-[10px] text-zinc-700 leading-tight">{selectedForPrint.senderAddress}</p>
                  </div>

                  <div className="p-2 space-y-0.5 bg-zinc-50">
                    <p className="text-[9px] font-mono font-bold uppercase text-zinc-600">PENERIMA (RECEIVER):</p>
                    <p className="font-bold text-zinc-900">{selectedForPrint.receiverName}</p>
                    <p className="text-[10px] text-zinc-700 leading-tight">{selectedForPrint.receiverAddress}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black text-center text-xs font-mono py-1.5 bg-zinc-100">
                  <div>
                    <span className="block text-[8px] text-zinc-500 uppercase">BERAT:</span>
                    <strong className="text-xs font-bold text-black">{selectedForPrint.weight} Kg</strong>
                  </div>
                  <div>
                    <span className="block text-[8px] text-zinc-500 uppercase">BIAYA ONGKIR:</span>
                    <strong className="text-xs font-bold text-black">{formatRupiah(selectedForPrint.amount)}</strong>
                  </div>
                  <div>
                    <span className="block text-[8px] text-zinc-500 uppercase">PEMBAYARAN:</span>
                    <strong className="text-[10px] font-bold text-black block truncate px-1">{selectedForPrint.paymentType.toUpperCase()}</strong>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-[10px]">
                  <div className="max-w-[200px] space-y-0.5 text-zinc-600">
                    <p className="font-mono text-[9px]">Janka Logistics Engine</p>
                    <p className="text-[8px]">Periksa kondisi paket sebelum tanda tangan.</p>
                  </div>
                  <div className="border border-dashed border-zinc-400 p-1.5 w-24 text-center rounded">
                    <span className="text-[8px] text-zinc-500 block">Tanda Tangan</span>
                    <div className="h-4" />
                  </div>
                </div>
              </div>

              <div className="no-print mt-3 flex items-center justify-between text-[11px] text-zinc-400">
                <span>Standard A6 Thermal Label ratio</span>
                <span className="font-mono">ESC or click X to close</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
