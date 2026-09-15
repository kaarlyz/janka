import React from 'react';
import { Package, Scale, ReceiptText, TrendingUp, Truck, Download, Upload } from 'lucide-react';
import { ShipmentEntry, CourierRateConfig } from '../types';
import { formatRupiah, formatWeight, formatNumber } from '../lib/formatters';

interface DashboardSummaryProps {
  shipments: ShipmentEntry[];
  rates: CourierRateConfig;
  onOpenRateSettings?: () => void;
  onExportBackup?: () => void;
  onOpenRestore?: () => void;
}

export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  shipments,
  rates,
  onOpenRateSettings,
  onExportBackup,
  onOpenRestore,
}) => {
  const totalShipments = shipments.length;
  const totalAmount = shipments.reduce((acc, curr) => acc + curr.amount, 0);
  const totalWeight = shipments.reduce((acc, curr) => acc + curr.weight, 0);
  const avgCostPerKg = totalWeight > 0 ? Math.round(totalAmount / totalWeight) : 0;

  const jtShipments = shipments.filter((s) => s.serviceType.includes('J&T') || s.resiNumber.startsWith('JT'));
  const jneShipments = shipments.filter((s) => s.serviceType.includes('JNE') || s.resiNumber.startsWith('JNE'));

  const jtCount = jtShipments.length;
  const jtAmount = jtShipments.reduce((acc, curr) => acc + curr.amount, 0);
  const jtWeight = jtShipments.reduce((acc, curr) => acc + curr.weight, 0);

  const jneCount = jneShipments.length;
  const jneAmount = jneShipments.reduce((acc, curr) => acc + curr.amount, 0);
  const jneWeight = jneShipments.reduce((acc, curr) => acc + curr.weight, 0);

  return (
    <div className="w-full space-y-3">
      {/* Header Toolbar: Section Title & Backup/Restore Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-0.5">
        <div className="flex items-center space-x-2">
          <ReceiptText className="h-4 w-4 text-slate-700" />
          <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Ringkasan Metrik &amp; Operasional Kas
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          {onExportBackup && (
            <button
              onClick={onExportBackup}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-mono text-[11px] font-bold rounded-[2px] cursor-pointer transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              title="Unduh cadangan data JSON"
            >
              <Download className="h-3.5 w-3.5 text-slate-600" />
              <span>Backup JSON</span>
            </button>
          )}

          {onOpenRestore && (
            <button
              onClick={onOpenRestore}
              className="flex items-center space-x-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-mono text-[11px] font-bold rounded-[2px] cursor-pointer transition-colors shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
              title="Muat file cadangan data JSON"
            >
              <Upload className="h-3.5 w-3.5 text-slate-600" />
              <span>Restore JSON</span>
            </button>
          )}
        </div>
      </div>

      {/* Top 4 Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Card 1: Total Paket */}
        <div className="bg-white border border-slate-300 rounded-[2px] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Manifest</span>
            <Package className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              {formatNumber(totalShipments)}
            </span>
            <span className="text-xs text-slate-500 font-medium">paket</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Volume terdaftar dalam ledger</p>
        </div>

        {/* Card 2: Total Kas Keluar */}
        <div className="bg-white border border-slate-300 rounded-[2px] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Kas Keluar</span>
            <ReceiptText className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              {formatRupiah(totalAmount)}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Disburse petty cash ekspedisi</p>
        </div>

        {/* Card 3: Total Berat */}
        <div className="bg-white border border-slate-300 rounded-[2px] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Akumulasi Berat</span>
            <Scale className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              {formatWeight(totalWeight)}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Total timbangan paket</p>
        </div>

        {/* Card 4: Rata-rata per Kg */}
        <div className="bg-white border border-slate-300 rounded-[2px] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          <div className="flex items-center justify-between text-slate-500 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider">Rata-Rata Biaya</span>
            <TrendingUp className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-mono text-xl font-bold text-slate-900 tabular-nums">
              {totalWeight > 0 ? formatRupiah(avgCostPerKg) : 'Rp 0'}
            </span>
            <span className="text-xs text-slate-500 font-medium">/kg</span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">Efisiensi pengeluaran kas per kg</p>
        </div>
      </div>

      {/* Courier Breakdown Panel */}
      <div className="bg-white border border-slate-300 rounded-[2px] p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-200">
          <div className="flex items-center space-x-2">
            <Truck className="h-3.5 w-3.5 text-slate-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Breakdown Alokasi Kurir
            </h3>
          </div>
          {onOpenRateSettings && (
            <button
              onClick={onOpenRateSettings}
              className="text-[11px] font-mono text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              Atur Tarif Default
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* J&T Breakdown */}
          <div className="border border-slate-200 bg-slate-50/70 rounded-[2px] p-2.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="px-1.5 py-0.5 rounded-[2px] bg-slate-900 text-white font-mono text-[10px] font-bold">
                  J&amp;T Express
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  (Tarif: {formatRupiah(rates.JT)}/kg)
                </span>
              </div>
              <div className="text-[11px] text-slate-600">
                <span>{jtCount} paket</span>
                <span className="mx-1 text-slate-300">•</span>
                <span>{formatWeight(jtWeight)}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                {formatRupiah(jtAmount)}
              </span>
              <span className="block text-[10px] text-slate-500">
                {totalAmount > 0 ? `${((jtAmount / totalAmount) * 100).toFixed(0)}% kas` : '0%'}
              </span>
            </div>
          </div>

          {/* JNE Breakdown */}
          <div className="border border-slate-200 bg-slate-50/70 rounded-[2px] p-2.5 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <span className="px-1.5 py-0.5 rounded-[2px] bg-slate-700 text-white font-mono text-[10px] font-bold">
                  JNE Express
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  (Tarif: {formatRupiah(rates.JNE)}/kg)
                </span>
              </div>
              <div className="text-[11px] text-slate-600">
                <span>{jneCount} paket</span>
                <span className="mx-1 text-slate-300">•</span>
                <span>{formatWeight(jneWeight)}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-slate-900 tabular-nums">
                {formatRupiah(jneAmount)}
              </span>
              <span className="block text-[10px] text-slate-500">
                {totalAmount > 0 ? `${((jneAmount / totalAmount) * 100).toFixed(0)}% kas` : '0%'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
