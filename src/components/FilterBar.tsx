import React from 'react';
import { Search, Calendar, RotateCcw, FileSpreadsheet, ArrowLeftRight, Settings } from 'lucide-react';
import { FilterState } from '../types';

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (next: FilterState) => void;
  onResetFilter: () => void;
  totalCount: number;
  filteredCount: number;
  onExportExcel: () => void;
  isExporting: boolean;
  onOpenReconcile: () => void;
  onOpenRates: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  onFilterChange,
  onResetFilter,
  totalCount,
  filteredCount,
  onExportExcel,
  isExporting,
  onOpenReconcile,
  onOpenRates,
}) => {
  const isFilterActive = Boolean(
    filters.search || filters.courier !== 'ALL' || filters.startDate || filters.endDate
  );

  return (
    <div className="bg-white border border-[#D5D9E0] rounded-[3px] p-3 shadow-sm space-y-3">
      {/* Top row: search & primary filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3 justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-[#6B7280] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              placeholder="Cari no. resi, pengirim, penerima..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#F9FAFB] border border-[#D5D9E0] rounded-[2px] text-[#111827] focus:bg-white focus:border-[#1E293B] focus:outline-none transition-colors"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, search: '' })}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#9CA3AF] hover:text-[#111827]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Courier Selector */}
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-medium text-[#4B5563] whitespace-nowrap">Kurir:</label>
            <select
              value={filters.courier}
              onChange={(e) => onFilterChange({ ...filters, courier: e.target.value as 'ALL' | 'JT' | 'JNE' })}
              className="text-xs bg-[#F9FAFB] border border-[#D5D9E0] rounded-[2px] px-2.5 py-1.5 text-[#111827] focus:bg-white focus:border-[#1E293B] focus:outline-none"
            >
              <option value="ALL">Semua Kurir</option>
              <option value="JT">J&T Express</option>
              <option value="JNE">JNE</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
              aria-label="Tanggal Awal"
              className="text-xs bg-[#F9FAFB] border border-[#D5D9E0] rounded-[2px] px-2 py-1 text-[#111827] focus:bg-white focus:border-[#1E293B] focus:outline-none"
            />
            <span className="text-xs text-[#9CA3AF]">s/d</span>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
              aria-label="Tanggal Akhir"
              className="text-xs bg-[#F9FAFB] border border-[#D5D9E0] rounded-[2px] px-2 py-1 text-[#111827] focus:bg-white focus:border-[#1E293B] focus:outline-none"
            />
          </div>

          {/* Reset Filter Button */}
          {isFilterActive && (
            <button
              type="button"
              onClick={onResetFilter}
              className="inline-flex items-center gap-1 text-xs px-2 py-1 text-[#DC2626] hover:bg-red-50 border border-red-200 rounded-[2px] font-medium transition-colors"
              title="Reset semua filter"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E5E7EB]">
          <button
            type="button"
            onClick={onOpenRates}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#374151] bg-[#F3F4F6] hover:bg-[#E5E7EB] border border-[#D5D9E0] rounded-[2px] transition-colors"
            title="Konfigurasi tarif dasar per kg"
          >
            <Settings className="w-3.5 h-3.5 text-[#6B7280]" />
            Tarif Kurir
          </button>

          <button
            type="button"
            onClick={onOpenReconcile}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[#374151] bg-[#F3F4F6] hover:bg-[#E5E7EB] border border-[#D5D9E0] rounded-[2px] transition-colors"
            title="Rekonsiliasi manifest malam dengan laporan J&T"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#6B7280]" />
            Rekonsiliasi J&T
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting || totalCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#1E293B] hover:bg-[#0F172A] disabled:bg-[#9CA3AF] disabled:cursor-not-allowed border border-[#0F172A] rounded-[2px] shadow-sm transition-colors"
            title="Unduh laporan Excel petty cash lengkap format resmi"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {isExporting ? 'Mengekspor...' : 'Ekspor Excel'}
          </button>
        </div>
      </div>

      {/* Filter status counter bar */}
      <div className="flex items-center justify-between text-[11px] text-[#6B7280] pt-1 border-t border-[#F3F4F6]">
        <div className="flex items-center gap-2">
          <span>
            Menampilkan <strong className="text-[#111827] font-mono">{filteredCount}</strong> dari{' '}
            <strong className="text-[#111827] font-mono">{totalCount}</strong> manifest
          </span>
          {isFilterActive && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] bg-[#EEF2F6] text-[#334155] border border-[#CBD5E1] rounded-[2px]">
              Filter Aktif
            </span>
          )}
        </div>
        <div className="hidden sm:block text-[11px] text-[#9CA3AF]">
          Klik header tabel untuk mengurutkan data
        </div>
      </div>
    </div>
  );
};
