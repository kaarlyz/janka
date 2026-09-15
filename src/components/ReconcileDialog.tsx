import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { RefreshCw, X, UploadCloud, Download, AlertCircle, FileCheck2 } from 'lucide-react';
import { ShipmentEntry } from '../types';

interface ReconcileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shipments: ShipmentEntry[];
  onApplyReconciliation: (resiMap: Map<string, string>) => number;
}

export const ReconcileDialog: React.FC<ReconcileDialogProps> = ({
  isOpen,
  onClose,
  shipments,
  onApplyReconciliation
}) => {
  const [reconcilePreview, setReconcilePreview] = useState<{
    totalRows: number;
    matchedCount: number;
    resiColumn: string;
    sellerColumn: string;
    sampleMatches: { resi: string; oldSeller: string; newSeller: string }[];
    rawData: Record<string, any>[];
  } | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const parseReconcileFile = async (file: File) => {
    setErrorMessage(null);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const jsonRows: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (jsonRows.length === 0) {
        setErrorMessage('File Excel kosong atau tidak terbaca.');
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

      // Note: Reconcile must match against ENTIRE shipments dataset
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
      setErrorMessage('Gagal memproses file Excel. Pastikan format file adalah .xlsx atau .csv.');
    }
  };

  const handleApply = () => {
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

    onApplyReconciliation(resiMap);
    setReconcilePreview(null);
    setErrorMessage(null);
    onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-[2px] overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-[#D5D9E0] rounded-[3px] p-5 shadow-2xl my-8 text-[#0F172A] space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-[2px] bg-blue-50 border border-blue-200 text-blue-700">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
                Rekonsiliasi Laporan Malam J&amp;T
              </h3>
              <p className="text-[11px] text-[#475569]">
                Sinkronisasi otomatis nama pengirim/seller berdasarkan nomor resi
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
              setReconcilePreview(null);
              setErrorMessage(null);
            }}
            className="btn-hover-lift p-1.5 rounded-[2px] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-3 rounded-[2px] bg-red-50 border border-red-200 text-red-800 flex items-center space-x-2 text-xs">
            <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* File Drag / Select */}
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
          className="border-2 border-dashed border-[#CBD5E1] hover:border-[#0F172A] hover:bg-[#F8FAFC] rounded-[2px] p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 bg-[#F8FAFC]"
        >
          <div className="p-2 rounded-[2px] bg-[#E2E8F0] text-[#0F172A]">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-bold text-[#0F172A]">
              Tarik &amp; Lepas File Laporan Harian J&amp;T (.xlsx / .csv)
            </p>
            <p className="text-[11px] text-[#475569]">
              Atau klik untuk memilih file dari komputer
            </p>
          </div>
        </div>

        {/* Sample Template Helper */}
        <div className="flex items-center justify-between p-2.5 rounded-[2px] bg-[#F8FAFC] border border-[#CBD5E1] text-xs">
          <span className="text-[#475569] text-[11px]">Butuh berkas contoh untuk pengujian langsung?</span>
          <button
            type="button"
            onClick={downloadSampleJTReport}
            className="btn-hover-lift text-blue-700 hover:text-blue-900 font-mono text-[11px] font-bold underline flex items-center space-x-1 cursor-pointer"
          >
            <Download className="h-3 w-3" />
            <span>Unduh Contoh</span>
          </button>
        </div>

        {/* Preview Area */}
        {reconcilePreview && (
          <div className="space-y-2.5 pt-2 border-t border-[#E2E8F0] text-xs">
            <div className="flex items-center justify-between p-2 rounded-[2px] bg-blue-50 border border-blue-200 text-blue-900 font-mono text-[11px]">
              <span>Ditemukan {reconcilePreview.matchedCount} resi cocok dari {reconcilePreview.totalRows} baris</span>
              <span className="font-bold">{reconcilePreview.matchedCount > 0 ? 'SIAP SINKRON' : 'TIDAK COCOK'}</span>
            </div>

            {reconcilePreview.sampleMatches.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-[#334155] uppercase">Pratinjau Data Cocok:</p>
                <div className="divide-y divide-[#E2E8F0] rounded-[2px] border border-[#CBD5E1] bg-[#F8FAFC] overflow-hidden font-mono text-[11px]">
                  {reconcilePreview.sampleMatches.map((m, i) => (
                    <div key={i} className="p-2 flex items-center justify-between">
                      <span className="text-[#334155] font-bold">{m.resi}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-red-600 line-through truncate max-w-[120px]">{m.oldSeller}</span>
                        <span className="text-[#94A3B8]">→</span>
                        <span className="text-emerald-700 font-bold truncate max-w-[140px]">{m.newSeller}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {reconcilePreview.matchedCount === 0 && (
              <div className="p-2 rounded-[2px] bg-amber-50 border border-amber-200 text-amber-800 flex items-center space-x-2 text-[11px]">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>Tidak ada nomor resi yang cocok dengan database. Data tidak akan diubah.</span>
              </div>
            )}
          </div>
        )}

        {/* Modal Actions */}
        <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              setReconcilePreview(null);
              setErrorMessage(null);
            }}
            className="btn-hover-lift px-3.5 py-1.5 rounded-[2px] border border-[#CBD5E1] hover:bg-[#F1F5F9] text-xs text-[#334155] font-medium transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={!reconcilePreview || reconcilePreview.matchedCount === 0}
            onClick={handleApply}
            className="btn-hover-lift inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[2px] bg-[#0F172A] hover:bg-[#1E293B] text-white font-semibold text-xs transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Terapkan &amp; Perbarui Ledger</span>
          </button>
        </div>
      </div>
    </div>
  );
};
