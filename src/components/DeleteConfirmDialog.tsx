import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { ShipmentEntry } from '../types';
import { formatRupiah } from '../lib/formatters';

interface DeleteConfirmDialogProps {
  isOpen: boolean;
  entry: ShipmentEntry | null;
  onClose: () => void;
  onConfirmDelete: (id: string) => void;
}

export const DeleteConfirmDialog: React.FC<DeleteConfirmDialogProps> = ({
  isOpen,
  entry,
  onClose,
  onConfirmDelete
}) => {
  if (!isOpen || !entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] animate-backdrop-fade">
      <div className="relative w-full max-w-sm bg-white border border-slate-300 rounded-[3px] p-5 shadow-xl text-slate-900 space-y-4 animate-modal-pop">
        {/* Header */}
        <div className="flex items-start space-x-3">
          <div className="p-2 rounded-[2px] bg-red-50 border border-red-200 text-red-600 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="flex-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Konfirmasi Hapus Entri
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Apakah Anda yakin ingin menghapus data pengiriman ini dari buku kas?
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-0.5 rounded-[2px]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Details Card */}
        <div className="border border-slate-200 bg-slate-50/70 rounded-[2px] p-3 text-xs space-y-1 font-mono">
          <div className="flex justify-between">
            <span className="text-slate-500">No. Resi:</span>
            <span className="font-bold text-slate-900">{entry.resiNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Pengirim:</span>
            <span className="text-slate-800 truncate max-w-[180px] font-sans">{entry.senderName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Penerima:</span>
            <span className="text-slate-800 truncate max-w-[180px] font-sans">{entry.receiverName}</span>
          </div>
          <div className="flex justify-between pt-1 border-t border-slate-200">
            <span className="text-slate-500">Biaya Ongkir:</span>
            <span className="font-bold text-red-600">{formatRupiah(entry.amount)}</span>
          </div>
        </div>

        <p className="text-[11px] text-red-700 bg-red-50/70 p-2 rounded-[2px] border border-red-100">
          Tindakan ini permanen dan akan mengurangi total kas keluar shift ini.
        </p>

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-200">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-[2px] border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirmDelete(entry.id);
              onClose();
            }}
            className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-[2px] bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Hapus Entri</span>
          </button>
        </div>
      </div>
    </div>
  );
};
