import React, { useState } from 'react';
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Printer,
  Edit2,
  Trash2,
  Copy,
  Check,
  MessageSquare,
  PackageOpen,
  SearchX,
} from 'lucide-react';
import { ShipmentEntry, SortConfig, SortField } from '../types';
import { formatRupiah, formatDateDDMMYYYY, formatWeight } from '../lib/formatters';

interface LedgerTableProps {
  shipments: ShipmentEntry[];
  allShipmentsCount: number;
  sortConfig: SortConfig;
  onSort: (field: SortField) => void;
  onEdit: (entry: ShipmentEntry) => void;
  onDelete: (entry: ShipmentEntry) => void;
  onPrint: (entry: ShipmentEntry) => void;
  onSendWhatsApp: (entry: ShipmentEntry) => void;
  onResetFilter: () => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  shipments,
  allShipmentsCount,
  sortConfig,
  onSort,
  onEdit,
  onDelete,
  onPrint,
  onSendWhatsApp,
  onResetFilter,
}) => {
  const [copiedResi, setCopiedResi] = useState<string | null>(null);

  const handleCopyResi = (resi: string) => {
    navigator.clipboard.writeText(resi);
    setCopiedResi(resi);
    setTimeout(() => setCopiedResi(null), 1800);
  };

  const renderSortIndicator = (field: SortField) => {
    if (sortConfig.field !== field) {
      return (
        <ArrowUpDown className="w-3 h-3 text-[#9CA3AF] opacity-50 group-hover:opacity-100 transition-opacity ml-1 inline-block" />
      );
    }
    return sortConfig.order === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#1E293B] ml-1 inline-block" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#1E293B] ml-1 inline-block" />
    );
  };

  // Subtotals for currently displayed shipments
  const displayedWeight = shipments.reduce((sum, s) => sum + (Number(s.weight) || 0), 0);
  const displayedAmount = shipments.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

  return (
    <div className="bg-white border border-[#D5D9E0] rounded-[3px] shadow-sm overflow-hidden">
      {/* Table Container */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#F8FAFC] text-[#475569] font-semibold border-b border-[#D5D9E0] text-[10px] uppercase tracking-wider">
              <th className="py-2 px-2 w-8 text-center text-[#64748B]">No.</th>
              <th
                onClick={() => onSort('date')}
                className="py-2 px-2.5 cursor-pointer select-none hover:text-[#0F172A] transition-colors whitespace-nowrap"
              >
                Tanggal {renderSortIndicator('date')}
              </th>
              <th
                onClick={() => onSort('resiNumber')}
                className="py-2 px-2.5 cursor-pointer select-none hover:text-[#0F172A] transition-colors whitespace-nowrap"
              >
                No. Resi {renderSortIndicator('resiNumber')}
              </th>
              <th
                onClick={() => onSort('senderName')}
                className="py-2 px-2.5 cursor-pointer select-none hover:text-[#0F172A] transition-colors"
              >
                Nama Pengirim {renderSortIndicator('senderName')}
              </th>
              <th
                onClick={() => onSort('receiverName')}
                className="py-2 px-2.5 cursor-pointer select-none hover:text-[#0F172A] transition-colors max-w-[140px]"
              >
                Penerima {renderSortIndicator('receiverName')}
              </th>
              <th className="py-2 px-2 text-center whitespace-nowrap">Jenis Paket</th>
              <th
                onClick={() => onSort('amount')}
                className="py-2 px-2.5 text-right cursor-pointer select-none hover:text-[#0F172A] transition-colors whitespace-nowrap"
              >
                Jumlah (Rp) {renderSortIndicator('amount')}
              </th>
              <th className="py-2 px-2 text-center whitespace-nowrap">Jenis Transaksi</th>
              <th className="py-2 px-2 text-center w-28">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E5E7EB]">
            {shipments.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-10 px-4 text-center">
                  {allShipmentsCount === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-1.5 text-[#64748B]">
                      <PackageOpen className="w-7 h-7 text-[#94A3B8]" />
                      <p className="font-medium text-xs text-[#334155]">Belum ada manifest tercatat</p>
                      <p className="text-[11px] text-[#64748B]">
                        Gunakan stasiun input di sebelah kiri untuk mencatat pengiriman pertama.
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-1.5 text-[#64748B]">
                      <SearchX className="w-7 h-7 text-[#94A3B8]" />
                      <p className="font-medium text-xs text-[#334155]">Tidak ada entri yang cocok</p>
                      <p className="text-[11px] text-[#64748B]">
                        Tidak ditemukan manifest dengan kriteria pencarian saat ini.
                      </p>
                      <button
                        type="button"
                        onClick={onResetFilter}
                        className="mt-1 px-2.5 py-0.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#334155] border border-[#CBD5E1] rounded-[2px] text-[11px] font-medium transition-colors"
                      >
                        Reset Kriteria Filter
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              shipments.map((entry, idx) => {
                const isJT =
                  entry.serviceType.toUpperCase().includes('J&T') ||
                  entry.serviceType.toUpperCase().includes('JT') ||
                  entry.resiNumber.startsWith('JT');

                const isDfod = entry.serviceType.toUpperCase().includes('DFOD');

                return (
                  <tr key={entry.id} className="hover:bg-[#F8FAFC] transition-colors group text-[#1E293B]">
                    {/* Index */}
                    <td className="py-1.5 px-2 text-center text-[#64748B] font-mono text-[10px]">{idx + 1}</td>

                    {/* Date dd/mm/yyyy */}
                    <td className="py-1.5 px-2.5 whitespace-nowrap text-[#334155] font-mono text-[11px]">
                      {formatDateDDMMYYYY(entry.date, entry.createdAt)}
                    </td>

                    {/* Resi */}
                    <td className="py-1.5 px-2.5 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-mono text-xs font-semibold text-[#0F172A]">
                        <span>{entry.resiNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyResi(entry.resiNumber)}
                          className="text-[#94A3B8] hover:text-[#0F172A] p-0.5 rounded transition-colors"
                          title="Salin No. Resi"
                        >
                          {copiedResi === entry.resiNumber ? (
                            <Check className="w-3 h-3 text-[#16A34A]" />
                          ) : (
                            <Copy className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Sender */}
                    <td className="py-1.5 px-2.5">
                      <div className="font-medium text-[#0F172A] leading-tight text-xs">{entry.senderName}</div>
                    </td>

                    {/* Receiver (Compacted for 2K layout) */}
                    <td className="py-1.5 px-2.5 max-w-[140px]">
                      <div className="font-medium text-[#334155] truncate text-[11px]" title={entry.receiverName}>
                        {entry.receiverName || '-'}
                      </div>
                    </td>

                    {/* Service Type / Jenis Paket */}
                    <td className="py-1.5 px-2 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 py-0.5 text-[10px] font-semibold border rounded-[2px] ${
                          isDfod
                            ? 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                            : isJT
                            ? 'bg-[#FEF2F2] text-[#991B1B] border-[#FECACA]'
                            : 'bg-[#EFF6FF] text-[#1E40AF] border-[#BFDBFE]'
                        }`}
                      >
                        {entry.serviceType || 'REGULER'}
                      </span>
                    </td>

                    {/* Amount */}
                    <td className="py-1.5 px-2.5 text-right font-mono font-bold text-[#0F172A] text-xs">
                      {formatRupiah(entry.amount)}
                    </td>

                    {/* Payment Type / Jenis Transaksi */}
                    <td className="py-1.5 px-2 text-center whitespace-nowrap font-mono text-[10px] font-semibold text-[#475569]">
                      <span className="px-1.5 py-0.5 bg-[#F1F5F9] border border-[#E2E8F0] rounded-[2px]">
                        {entry.paymentType || 'CASH'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-1.5 px-2 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={() => onSendWhatsApp(entry)}
                          className="p-1 text-[#475569] hover:text-[#16A34A] hover:bg-[#F0FDF4] border border-transparent hover:border-[#BBF7D0] rounded-[2px] transition-colors"
                          title="Kirim WA Notifikasi"
                        >
                          <MessageSquare className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrint(entry)}
                          className="p-1 text-[#475569] hover:text-[#1E293B] hover:bg-[#F1F5F9] border border-transparent hover:border-[#CBD5E1] rounded-[2px] transition-colors"
                          title="Cetak Label Thermal"
                        >
                          <Printer className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(entry)}
                          className="p-1 text-[#475569] hover:text-[#2563EB] hover:bg-[#EFF6FF] border border-transparent hover:border-[#BFDBFE] rounded-[2px] transition-colors"
                          title="Edit Manifest"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(entry)}
                          className="p-1 text-[#475569] hover:text-[#DC2626] hover:bg-[#FEF2F2] border border-transparent hover:border-[#FECACA] rounded-[2px] transition-colors"
                          title="Hapus Manifest"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Subtotal Footer */}
          {shipments.length > 0 && (
            <tfoot>
              <tr className="bg-[#F8FAFC] border-t-2 border-[#CBD5E1] text-[#0F172A] font-medium text-xs">
                <td colSpan={5} className="py-2 px-2.5 font-bold text-right text-[11px]">
                  SUBTOTAL ({shipments.length} Paket | {formatWeight(displayedWeight)}):
                </td>
                <td></td>
                <td className="py-2 px-2.5 text-right font-mono font-bold text-[#0F172A] text-xs">
                  {formatRupiah(displayedAmount)}
                </td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
};
