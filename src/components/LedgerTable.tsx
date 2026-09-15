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

// Custom SVG Line-Art Ilustrasi Paket Kosong (Ledger Kosong)
function EmptyLedgerBoxSvg() {
  return (
    <svg
      className="w-16 h-16 text-[#334155] mb-2"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22L32 12L52 22V44L32 54L12 44V22Z" />
      <path d="M32 12V32" />
      <path d="M12 22L32 32L52 22" />
      <path d="M22 17L42 27" strokeDasharray="2 2" />
      <path d="M32 32V54" />
      <path d="M20 39H44" />
    </svg>
  );
}

// Custom SVG Line-Art Ilustrasi Hasil Filter Kosong
function EmptyFilterBoxSvg() {
  return (
    <svg
      className="w-16 h-16 text-[#334155] mb-2"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 20L28 11L46 20V40L28 49L10 40V20Z" />
      <path d="M28 11V29" />
      <path d="M10 20L28 29L46 20" />
      <circle cx="44" cy="44" r="9" fill="#FFFFFF" />
      <circle cx="44" cy="44" r="9" />
      <path d="M50 50L57 57" strokeWidth="2" />
      <path d="M40 44H48" />
    </svg>
  );
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
        <ArrowUpDown className="w-3 h-3 text-[#475569] opacity-60 group-hover:opacity-100 transition-opacity ml-1 inline-block" />
      );
    }
    return sortConfig.order === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-[#0F172A] ml-1 inline-block" />
    ) : (
      <ArrowDown className="w-3 h-3 text-[#0F172A] ml-1 inline-block" />
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
            <tr className="bg-[#F8FAFC] text-[#334155] font-semibold border-b border-[#D5D9E0] text-[10px] 2xl:text-xs uppercase tracking-wider">
              <th className="py-2.5 2xl:py-3.5 px-2 2xl:px-3 w-8 2xl:w-10 text-center text-[#475569]">No.</th>
              <th
                onClick={() => onSort('date')}
                className="py-2.5 2xl:py-3.5 px-2.5 2xl:px-4 cursor-pointer select-none hover:text-[#0F172A] transition-colors whitespace-nowrap"
              >
                Tanggal {renderSortIndicator('date')}
              </th>
              <th
                onClick={() => onSort('resiNumber')}
                className="py-2.5 2xl:py-3.5 px-2.5 2xl:px-4 cursor-pointer select-none hover:text-[#0F172A] transition-colors whitespace-nowrap"
              >
                No. Resi {renderSortIndicator('resiNumber')}
              </th>
              <th
                onClick={() => onSort('senderName')}
                className="py-2.5 2xl:py-3.5 px-2.5 2xl:px-4 cursor-pointer select-none hover:text-[#0F172A] transition-colors"
              >
                Nama Pengirim {renderSortIndicator('senderName')}
              </th>
              <th
                onClick={() => onSort('receiverName')}
                className="py-2.5 2xl:py-3.5 px-2.5 2xl:px-4 cursor-pointer select-none hover:text-[#0F172A] transition-colors max-w-[140px] 2xl:max-w-[180px]"
              >
                Penerima {renderSortIndicator('receiverName')}
              </th>
              <th className="py-2.5 2xl:py-3.5 px-2 2xl:px-3 text-center whitespace-nowrap">Jenis Paket</th>
              <th
                onClick={() => onSort('amount')}
                className="py-2.5 2xl:py-3.5 px-2.5 2xl:px-4 text-right cursor-pointer select-none hover:text-[#0F172A] transition-colors whitespace-nowrap"
              >
                Jumlah (Rp) {renderSortIndicator('amount')}
              </th>
              <th className="py-2.5 2xl:py-3.5 px-2 2xl:px-3 text-center whitespace-nowrap">Jenis Transaksi</th>
              <th className="py-2.5 2xl:py-3.5 px-2 2xl:px-3 text-center w-28 2xl:w-32">Aksi</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-[#E2E8F0]">
            {shipments.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 2xl:py-16 px-4 text-center">
                  {allShipmentsCount === 0 ? (
                    <div className="flex flex-col items-center justify-center space-y-2 text-[#475569]">
                      <EmptyLedgerBoxSvg />
                      <p className="font-bold text-sm 2xl:text-base text-[#0F172A]">Belum ada manifest tercatat</p>
                      <p className="text-xs 2xl:text-sm text-[#475569] max-w-sm 2xl:max-w-md leading-relaxed">
                        Buku besar kas reguler masih kosong. Gunakan stasiun input manifest di panel sebelah kiri untuk mencatat pengiriman pertama.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const el = document.getElementById('entry-date');
                          if (el) el.focus();
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className="btn-hover-lift mt-2 px-4 py-2 2xl:py-2.5 bg-[#0F172A] hover:bg-[#1E293B] text-white border border-[#0F172A] rounded-[2px] text-xs 2xl:text-sm font-bold shadow-sm transition-all duration-[120ms]"
                      >
                        Catat Manifest Pertama
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center space-y-2 text-[#475569]">
                      <EmptyFilterBoxSvg />
                      <p className="font-bold text-sm 2xl:text-base text-[#0F172A]">Tidak ada entri yang cocok</p>
                      <p className="text-xs 2xl:text-sm text-[#475569] max-w-sm 2xl:max-w-md leading-relaxed">
                        Pencarian atau kriteria filter tanggal/kurir saat ini tidak menemukan data manifest.
                      </p>
                      <button
                        type="button"
                        onClick={onResetFilter}
                        className="btn-hover-lift mt-2 px-4 py-1.5 2xl:py-2 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] border border-[#CBD5E1] rounded-[2px] text-xs 2xl:text-sm font-bold transition-all duration-[120ms]"
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
                  <tr
                    key={entry.id}
                    className="row-elevate row-hover-lift hover:bg-[#F8FAFC] transition-all duration-[120ms] group text-[#0F172A]"
                  >
                    {/* Index */}
                    <td className="py-2.5 2xl:py-3.5 px-2 2xl:px-3 text-center text-[#475569] font-mono text-[10px] 2xl:text-xs">{idx + 1}</td>

                    {/* Date dd/mm/yyyy */}
                    <td className="py-2.5 2xl:py-3.5 px-2.5 2xl:px-4 whitespace-nowrap text-[#334155] font-mono text-[11px] 2xl:text-xs">
                      {formatDateDDMMYYYY(entry.date, entry.createdAt)}
                    </td>

                    {/* Resi */}
                    <td className="py-2.5 2xl:py-3.5 px-2.5 2xl:px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1 font-mono text-xs 2xl:text-sm font-bold text-[#0F172A]">
                        <span>{entry.resiNumber}</span>
                        <button
                          type="button"
                          onClick={() => handleCopyResi(entry.resiNumber)}
                          className="btn-hover-lift text-[#475569] hover:text-[#0F172A] p-0.5 rounded transition-colors"
                          title="Salin No. Resi"
                        >
                          {copiedResi === entry.resiNumber ? (
                            <Check className="w-3 2xl:w-3.5 h-3 2xl:h-3.5 text-[#16A34A]" />
                          ) : (
                            <Copy className="w-2.5 2xl:w-3 h-2.5 2xl:h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </button>
                      </div>
                    </td>

                    {/* Sender */}
                    <td className="py-2.5 2xl:py-3.5 px-2.5 2xl:px-4">
                      <div className="font-semibold text-[#0F172A] leading-tight text-xs 2xl:text-sm">{entry.senderName}</div>
                    </td>

                    {/* Receiver */}
                    <td className="py-2.5 2xl:py-3.5 px-2.5 2xl:px-4 max-w-[140px] 2xl:max-w-[180px]">
                      <div className="font-medium text-[#334155] truncate text-[11px] 2xl:text-xs" title={entry.receiverName}>
                        {entry.receiverName || '-'}
                      </div>
                    </td>

                    {/* Service Type / Jenis Paket */}
                    <td className="py-2.5 2xl:py-3.5 px-2 2xl:px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-block px-1.5 2xl:px-2 py-0.5 2xl:py-1 text-[10px] 2xl:text-xs font-semibold border rounded-[2px] ${
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
                    <td className="py-2.5 2xl:py-3.5 px-2.5 2xl:px-4 text-right font-mono font-bold text-[#0F172A] text-xs 2xl:text-sm">
                      {formatRupiah(entry.amount)}
                    </td>

                    {/* Payment Type / Jenis Transaksi */}
                    <td className="py-2.5 2xl:py-3.5 px-2 2xl:px-3 text-center whitespace-nowrap font-mono text-[10px] 2xl:text-xs font-semibold text-[#334155]">
                      <span className="px-1.5 2xl:px-2 py-0.5 2xl:py-1 bg-[#F1F5F9] border border-[#CBD5E1] rounded-[2px]">
                        {entry.paymentType || 'CASH'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-2.5 2xl:py-3.5 px-2 2xl:px-3 text-center whitespace-nowrap">
                      <div className="inline-flex items-center gap-1 2xl:gap-1.5">
                        <button
                          type="button"
                          onClick={() => onSendWhatsApp(entry)}
                          className="btn-hover-lift p-1.5 2xl:p-2 text-[#334155] hover:text-[#16A34A] hover:bg-[#F0FDF4] border border-transparent hover:border-[#BBF7D0] rounded-[2px] transition-all duration-[120ms]"
                          title="Kirim WA Notifikasi"
                        >
                          <MessageSquare className="w-3.5 2xl:w-4 h-3.5 2xl:h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onPrint(entry)}
                          className="btn-hover-lift p-1.5 2xl:p-2 text-[#334155] hover:text-[#0F172A] hover:bg-[#F1F5F9] border border-transparent hover:border-[#CBD5E1] rounded-[2px] transition-all duration-[120ms]"
                          title="Cetak Label Thermal"
                        >
                          <Printer className="w-3.5 2xl:w-4 h-3.5 2xl:h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEdit(entry)}
                          className="btn-hover-lift p-1.5 2xl:p-2 text-[#334155] hover:text-[#2563EB] hover:bg-[#EFF6FF] border border-transparent hover:border-[#BFDBFE] rounded-[2px] transition-all duration-[120ms]"
                          title="Edit Manifest"
                        >
                          <Edit2 className="w-3.5 2xl:w-4 h-3.5 2xl:h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(entry)}
                          className="btn-hover-lift p-1.5 2xl:p-2 text-[#334155] hover:text-[#DC2626] hover:bg-[#FEF2F2] border border-transparent hover:border-[#FECACA] rounded-[2px] transition-all duration-[120ms]"
                          title="Hapus Manifest"
                        >
                          <Trash2 className="w-3.5 2xl:w-4 h-3.5 2xl:h-4" />
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
              <tr className="bg-[#F8FAFC] border-t-2 border-[#CBD5E1] text-[#0F172A] font-medium text-xs 2xl:text-sm">
                <td colSpan={5} className="py-2.5 2xl:py-3.5 px-2.5 2xl:px-4 font-bold text-right text-[11px] 2xl:text-xs">
                  SUBTOTAL ({shipments.length} Paket | {formatWeight(displayedWeight)}):
                </td>
                <td></td>
                <td className="py-2.5 2xl:py-3.5 px-2.5 2xl:px-4 text-right font-mono font-bold text-[#0F172A] text-xs 2xl:text-sm">
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
