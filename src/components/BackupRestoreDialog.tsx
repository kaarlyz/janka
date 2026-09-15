import React, { useState, useRef } from 'react';
import { Upload, X, AlertTriangle, CheckCircle2, FileText } from 'lucide-react';
import { ShipmentEntry, CourierRateConfig } from '../types';
import { validateBackupJSON, BackupValidationSuccess } from '../lib/backup';

interface BackupRestoreDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentShipmentsCount: number;
  onConfirmRestore: (shipments: ShipmentEntry[], rates: CourierRateConfig) => { success: boolean; error?: string };
  showToast: (msg: string) => void;
}

export const BackupRestoreDialog: React.FC<BackupRestoreDialogProps> = ({
  isOpen,
  onClose,
  currentShipmentsCount,
  onConfirmRestore,
  showToast,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [preview, setPreview] = useState<BackupValidationSuccess | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleReset = () => {
    setSelectedFile(null);
    setFileError(null);
    setPreview(null);
    setRestoreError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileError(null);
    setPreview(null);
    setRestoreError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const result = validateBackupJSON(content);
      if (!result.valid) {
        setFileError(result.error);
        setPreview(null);
      } else {
        setPreview(result);
        setFileError(null);
      }
    };
    reader.onerror = () => {
      setFileError('Gagal membaca file dari sistem lokal.');
      setPreview(null);
    };
    reader.readAsText(file);
  };

  const handleExecuteRestore = () => {
    if (!preview) return;

    const res = onConfirmRestore(preview.payload.shipments, preview.payload.rates);
    if (!res.success) {
      setRestoreError(res.error || 'Gagal melakukan restore data.');
    } else {
      showToast(`Restore berhasil! ${preview.payload.shipments.length} manifest telah dimuat ke ledger.`);
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[1px] animate-fade-in">
      <div className="bg-white border border-slate-300 rounded-[2px] shadow-xl w-full max-w-lg flex flex-col overflow-hidden">
        {/* Dialog Header */}
        <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="h-4 w-4 text-sky-400" />
            <h3 className="font-mono text-sm font-bold tracking-wide">RESTORE DATASET JSON</h3>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-white p-1 rounded-[2px] transition-colors cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Dialog Body */}
        <div className="p-4 space-y-4 text-xs text-slate-700">
          {/* File Picker Zone */}
          <div>
            <label className="block text-[11px] font-bold text-slate-900 uppercase tracking-wider mb-1">
              Pilih File Backup JSON
            </label>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json,application/json"
              onChange={handleFileChange}
              className="hidden"
              id="janka-backup-file-input"
            />
            <label
              htmlFor="janka-backup-file-input"
              className="flex items-center justify-between border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100/80 p-3 rounded-[2px] cursor-pointer transition-colors"
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="font-mono text-slate-800 font-medium">
                  {selectedFile ? selectedFile.name : 'Pilih file janka-backup-*.json...'}
                </span>
              </div>
              <span className="bg-slate-200 text-slate-800 text-[10px] font-mono px-2 py-0.5 rounded-[2px] font-bold">
                Browse
              </span>
            </label>
          </div>

          {/* Validation Error Box */}
          {fileError && (
            <div className="border border-red-300 bg-red-50 text-red-800 p-3 rounded-[2px] flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px] uppercase tracking-wider">Validasi File Gagal</p>
                <p className="text-xs mt-0.5 leading-relaxed">{fileError}</p>
              </div>
            </div>
          )}

          {/* Restore Local Storage Quota Error Box */}
          {restoreError && (
            <div className="border border-red-300 bg-red-50 text-red-800 p-3 rounded-[2px] flex items-start space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-[11px] uppercase tracking-wider">Gagal Mengubah Storage</p>
                <p className="text-xs mt-0.5 leading-relaxed">{restoreError}</p>
              </div>
            </div>
          )}

          {/* Valid Preview Box */}
          {preview && (
            <div className="space-y-3">
              <div className="border border-emerald-300 bg-emerald-50/60 p-3 rounded-[2px] space-y-2">
                <div className="flex items-center space-x-1.5 text-emerald-800 font-bold text-[11px] uppercase tracking-wider">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <span>Struktur File Backup Valid (Versi 1)</span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                  <div className="bg-white border border-emerald-200 p-2 rounded-[2px]">
                    <span className="text-slate-500 block text-[10px]">TOTAL MANIFEST</span>
                    <span className="font-mono text-sm font-bold text-slate-900">
                      {preview.summary.count} paket
                    </span>
                  </div>
                  <div className="bg-white border border-emerald-200 p-2 rounded-[2px]">
                    <span className="text-slate-500 block text-[10px]">RENTANG TANGGAL</span>
                    <span className="font-mono text-xs font-bold text-slate-900 truncate block">
                      {preview.summary.dateRange}
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-600 space-y-0.5 pt-1 border-t border-emerald-200">
                  <p>
                    <span className="font-semibold text-slate-800">Waktu Backup:</span>{' '}
                    {preview.summary.exportedAtDisplay}
                  </p>
                  <p>
                    <span className="font-semibold text-slate-800">Tarif Kurir Backup:</span>{' '}
                    {preview.summary.ratesDisplay}
                  </p>
                </div>
              </div>

              {/* Warning Replacement Box */}
              <div className="border border-amber-300 bg-amber-50 text-amber-900 p-3 rounded-[2px] flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-[11px]">
                  <p className="font-bold uppercase tracking-wider">Peringatan Overwrite Data</p>
                  <p className="mt-0.5 leading-relaxed">
                    Proses restore ini akan <strong className="underline">menggantikan seluruh</strong> data manifest saat ini ({currentShipmentsCount} paket) dan tarif kurir dengan data dari file backup.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer Actions */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between">
          <button
            onClick={handleClose}
            className="px-3 py-1.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-100 font-mono text-xs font-bold rounded-[2px] cursor-pointer transition-colors"
          >
            Batal
          </button>

          {preview && (
            <button
              onClick={handleExecuteRestore}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-mono text-xs font-bold rounded-[2px] cursor-pointer transition-colors shadow-sm"
            >
              Konfirmasi Restore Dataset
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
