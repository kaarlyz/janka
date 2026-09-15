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

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

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
      alert('Gagal memproses file Excel. Pastikan format file adalah .xlsx atau .csv.');
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
      <div className="relative w-full max-w-lg bg-white border border-slate-300 rounded-[3px] p-5 shadow-2xl my-8 text-slate-900 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 rounded-[2px] bg-blue-50 border border-blue-200 text-blue-700">
              <RefreshCw className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Rekonsiliasi Laporan Malam J&amp;T
              </h3>
              <p className="text-[11px] text-slate-500">
                Sinkronisasi otomatis nama pengirim/seller berdasarkan nomor resi
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              onClose();
              setReconcilePreview(null);
            }}
            className="p-1 rounded-[2px] text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

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
          className="border-2 border-dashed border-slate-300 hover:border-slate-500 hover:bg-slate-50/70 rounded-[2px] p-6 text-center cursor-pointer transition flex flex-col items-center justify-center space-y-2 bg-slate-50"
        >
          <div className="p-2 rounded-[2px] bg-slate-200 text-slate-700">
            <UploadCloud className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-900">
              Tarik &amp; Lepas File Laporan Harian J&amp;T (.xlsx / .csv)
            </p>
            <p className="text-[11px] text-slate-500">
              Atau klik untuk memilih file dari komputer
            </p>
          </div>
        </div>

        {/* Sample Template Helper */}
        <div className="flex items-center justify-between p-2.5 rounded-[2px] bg-slate-50 border border-slate-200 text-xs">
          <span className="text-slate-600 text-[11px]">Butuh berkas contoh untuk pengujian langsung?</span>
          <button
            onClick={downloadSampleJTReport}
            className="text-blue-700 hover:text-blue-900 font-mono text-[11px] underline flex items-center space-x-1 cursor-pointer"
          >
            <Download className="h-3 w-3" />
            <span>Unduh Contoh</span>
          </button>
        </div>

        {/* Preview Area */}
        {reconcilePreview && (
          <div className="space-y-2.5 pt-2 border-t border-slate-200 text-xs">
            <div className="flex items-center justify-between p-2 rounded-[2px] bg-blue-50 border border-blue-200 text-blue-900 font-mono text-[11px]">
              <span>Ditemukan {reconcilePreview.matchedCount} resi cocok dari {reconcilePreview.totalRows} baris</span>
              <span className="font-bold">{reconcilePreview.matchedCount > 0 ? 'SIAP SINKRON' : 'TIDAK COCOK'}</span>
            </div>

            {reconcilePreview.sampleMatches.length > 0 && (
              <div className="space-y-1">
                <p className="text-[11px] font-bold text-slate-700 uppercase">Pratinjau Data Cocok:</p>
                <div className="divide-y divide-slate-200 rounded-[2px] border border-slate-200 bg-slate-50 overflow-hidden font-mono text-[11px]">
                  {reconcilePreview.sampleMatches.map((m, i) => (
                    <div key={i} className="p-2 flex items-center justify-between">
                      <span className="text-slate-600 font-bold">{m.resi}</span>
                      <div className="flex items-center space-x-2">
                        <span className="text-red-600 line-through truncate max-w-[120px]">{m.oldSeller}</span>
                        <span className="text-slate-400">→</span>
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
        <div className="pt-2 border-t border-slate-200 flex items-center justify-end space-x-2">
          <button
            onClick={() => {
              onClose();
              setReconcilePreview(null);
            }}
            className="px-3 py-1.5 rounded-[2px] border border-slate-300 hover:bg-slate-50 text-xs text-slate-700 transition cursor-pointer"
          >
            Batal
          </button>
          <button
            disabled={!reconcilePreview || reconcilePreview.matchedCount === 0}
            onClick={handleApply}
            className="inline-flex items-center space-x-1.5 px-3.5 py-1.5 rounded-[2px] bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition shadow-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>Terapkan &amp; Perbarui Ledger</span>
          </button>
        </div>
      </div>
    </div>
  );
};
