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
            <Search className="w-4 h-4 text-[#475569] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="filter-search"
              type="text"
              value={filters.search}
              onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
              placeholder="Cari no. resi, pengirim, penerima..."
              className="w-full pl-8 pr-7 py-2 text-xs bg-[#F9FAFB] border border-[#D5D9E0] rounded-[2px] text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors"
            />
            {filters.search && (
              <button
                type="button"
                onClick={() => onFilterChange({ ...filters, search: '' })}
                className="btn-hover-lift absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#475569] hover:text-[#0F172A]"
                title="Hapus kata kunci pencarian"
              >
                ✕
              </button>
            )}
          </div>

          {/* Courier Selector */}
          <div className="flex items-center gap-1.5">
            <label htmlFor="filter-courier" className="text-xs font-semibold text-[#334155] whitespace-nowrap">
              Kurir:
            </label>
            <select
              id="filter-courier"
              value={filters.courier}
              onChange={(e) => onFilterChange({ ...filters, courier: e.target.value as 'ALL' | 'JT' | 'JNE' })}
              className="text-xs bg-[#F9FAFB] border border-[#D5D9E0] rounded-[2px] px-2.5 py-2 text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors"
            >
              <option value="ALL">Semua Kurir</option>
              <option value="JT">J&T Express</option>
              <option value="JNE">JNE</option>
            </select>
          </div>

          {/* Date Range */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-[#475569]" />
            <input
              id="filter-start-date"
              type="date"
              value={filters.startDate}
              onChange={(e) => onFilterChange({ ...filters, startDate: e.target.value })}
              aria-label="Tanggal Awal"
              className="text-xs bg-[#F9FAFB] border border-[#D5D9E0] rounded-[2px] px-2 py-1.5 text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors"
            />
            <span className="text-xs text-[#475569]">s/d</span>
            <input
              id="filter-end-date"
              type="date"
              value={filters.endDate}
              onChange={(e) => onFilterChange({ ...filters, endDate: e.target.value })}
              aria-label="Tanggal Akhir"
              className="text-xs bg-[#F9FAFB] border border-[#D5D9E0] rounded-[2px] px-2 py-1.5 text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors"
            />
          </div>

          {/* Reset Filter Button */}
          {isFilterActive && (
            <button
              type="button"
              onClick={onResetFilter}
              className="btn-hover-lift inline-flex items-center gap-1 text-xs px-2.5 py-1.5 text-[#DC2626] hover:bg-red-50 border border-red-200 rounded-[2px] font-medium transition-all duration-[120ms]"
              title="Reset semua filter"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 lg:pt-0 border-t lg:border-t-0 border-[#E2E8F0]">
          <button
            type="button"
            onClick={onOpenRates}
            className="btn-hover-lift inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#334155] bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-[2px] transition-all duration-[120ms]"
            title="Konfigurasi tarif dasar per kg"
          >
            <Settings className="w-3.5 h-3.5 text-[#475569]" />
            Tarif Kurir
          </button>

          <button
            type="button"
            onClick={onOpenReconcile}
            className="btn-hover-lift inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#334155] bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-[2px] transition-all duration-[120ms]"
            title="Rekonsiliasi manifest malam dengan laporan J&T"
          >
            <ArrowLeftRight className="w-3.5 h-3.5 text-[#475569]" />
            Rekonsiliasi J&T
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            disabled={isExporting || totalCount === 0}
            className={`btn-hover-lift inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white border border-[#0F172A] rounded-[2px] shadow-sm transition-all duration-[120ms] ${
              isExporting
                ? 'animate-shimmer text-white border-[#334155] cursor-wait'
                : 'bg-[#0F172A] hover:bg-[#1E293B] disabled:bg-[#94A3B8] disabled:border-[#94A3B8] disabled:cursor-not-allowed'
            }`}
            title="Unduh laporan Excel petty cash lengkap format resmi"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            {isExporting ? 'Proses Ekspor Excel...' : 'Ekspor Excel'}
          </button>
        </div>
      </div>

      {/* Filter status counter bar */}
      <div className="flex items-center justify-between text-[11px] text-[#475569] pt-1.5 border-t border-[#F1F5F9]">
        <div className="flex items-center gap-2">
          <span>
            Menampilkan <strong className="text-[#0F172A] font-mono">{filteredCount}</strong> dari{' '}
            <strong className="text-[#0F172A] font-mono">{totalCount}</strong> manifest
          </span>
          {isFilterActive && (
            <span className="inline-block px-1.5 py-0.5 text-[10px] font-semibold bg-[#E2E8F0] text-[#0F172A] border border-[#CBD5E1] rounded-[2px]">
              Filter Aktif
            </span>
          )}
        </div>
        <div className="hidden sm:block text-[11px] text-[#475569]">
          Klik header tabel untuk mengurutkan data
        </div>
      </div>
    </div>
  );
};
