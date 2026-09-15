import React, { useState } from 'react';
import { Settings2, X, Check, RotateCcw } from 'lucide-react';
import { CourierRateConfig } from '../types';
import { DEFAULT_RATES } from '../hooks/useShipments';
import { formatRupiah } from '../lib/formatters';

interface RateSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  rates: CourierRateConfig;
  onSaveRates: (newRates: CourierRateConfig) => void;
}

export const RateSettingsDialog: React.FC<RateSettingsDialogProps> = ({
  isOpen,
  onClose,
  rates,
  onSaveRates
}) => {
  const [jtRate, setJtRate] = useState<string>(String(rates.JT));
  const [jneRate, setJneRate] = useState<string>(String(rates.JNE));
  const [feedback, setFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const jtNum = parseInt(jtRate, 10);
    const jneNum = parseInt(jneRate, 10);

    if (isNaN(jtNum) || jtNum <= 0 || isNaN(jneNum) || jneNum <= 0) {
      setFeedback('Tarif per kg harus berupa angka positif.');
      return;
    }

    onSaveRates({
      JT: jtNum,
      JNE: jneNum
    });
    setFeedback('Tarif ekspedisi berhasil diperbarui.');
    setTimeout(() => {
      setFeedback(null);
      onClose();
    }, 600);
  };

  const handleResetToDefault = () => {
    setJtRate(String(DEFAULT_RATES.JT));
    setJneRate(String(DEFAULT_RATES.JNE));
    onSaveRates(DEFAULT_RATES);
    setFeedback('Tarif dikembalikan ke pengaturan standar pabrik.');
    setTimeout(() => setFeedback(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-[2px] animate-backdrop-fade">
      <div className="relative w-full max-w-md bg-white border border-slate-300 rounded-[3px] p-5 shadow-xl text-slate-900 space-y-4 animate-modal-pop">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Settings2 className="h-4 w-4 text-slate-700" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Pengaturan Tarif Ekspedisi
              </h3>
              <p className="text-[11px] text-slate-500">
                Dasar kalkulasi biaya otomatis per kilogram (pembulatan ke atas)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-[2px] text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-3">
            {/* J&T Rate */}
            <div className="border border-slate-200 bg-slate-50/60 rounded-[2px] p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">J&amp;T Express</label>
                <span className="text-[10px] font-mono text-slate-500">
                  Standar: {formatRupiah(DEFAULT_RATES.JT)}/kg
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-500">Rp</span>
                <input
                  type="number"
                  step="500"
                  min="1000"
                  required
                  value={jtRate}
                  onChange={(e) => setJtRate(e.target.value)}
                  className="flex-1 font-mono text-xs font-bold bg-white border border-slate-300 focus:border-slate-800 rounded-[2px] px-2.5 py-1.5 outline-none text-slate-900"
                />
                <span className="text-xs text-slate-500">/ kg</span>
              </div>
            </div>

            {/* JNE Rate */}
            <div className="border border-slate-200 bg-slate-50/60 rounded-[2px] p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-900">JNE Express</label>
                <span className="text-[10px] font-mono text-slate-500">
                  Standar: {formatRupiah(DEFAULT_RATES.JNE)}/kg
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono text-slate-500">Rp</span>
                <input
                  type="number"
                  step="500"
                  min="1000"
                  required
                  value={jneRate}
                  onChange={(e) => setJneRate(e.target.value)}
                  className="flex-1 font-mono text-xs font-bold bg-white border border-slate-300 focus:border-slate-800 rounded-[2px] px-2.5 py-1.5 outline-none text-slate-900"
                />
                <span className="text-xs text-slate-500">/ kg</span>
              </div>
            </div>
          </div>

          {feedback && (
            <p className="text-[11px] font-mono text-slate-700 bg-slate-100 p-2 rounded-[2px] border border-slate-200">
              {feedback}
            </p>
          )}

          {/* Buttons */}
          <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
            <button
              type="button"
              onClick={handleResetToDefault}
              className="inline-flex items-center space-x-1 px-2.5 py-1.5 rounded-[2px] text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-[11px] font-medium transition cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Reset Standar</span>
            </button>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-[2px] border border-slate-300 hover:bg-slate-50 text-xs font-medium text-slate-700 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center space-x-1 px-3.5 py-1.5 rounded-[2px] bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Simpan Tarif</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
