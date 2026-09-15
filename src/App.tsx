import { useState, useMemo } from 'react';
import { useShipments } from './hooks/useShipments';
import { exportPremiumExcel, exportToCSV } from './lib/excel';
import { exportBackupJSON } from './lib/backup';
import { normalizeToISODate } from './lib/formatters';
import {
  ShipmentEntry,
  CourierRateConfig,
  FilterState,
  SortConfig,
  SortField,
} from './types';

// Modular Components
import { DashboardSummary } from './components/DashboardSummary';
import { EntryForm } from './components/EntryForm';
import { FilterBar } from './components/FilterBar';
import { LedgerTable } from './components/LedgerTable';
import { RateSettingsDialog } from './components/RateSettingsDialog';
import { DeleteConfirmDialog } from './components/DeleteConfirmDialog';
import { PrintLabelDialog } from './components/PrintLabelDialog';
import { ReconcileDialog } from './components/ReconcileDialog';
import { BackupRestoreDialog } from './components/BackupRestoreDialog';

export default function App() {
  const {
    shipments,
    rates,
    updateRates,
    addShipment,
    updateShipment,
    deleteShipment,
    reconcileAll,
    restoreBackup,
    addressBook,
  } = useShipments();

  // ── MODAL & DIALOG STATES ──
  const [editingEntry, setEditingEntry] = useState<ShipmentEntry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<ShipmentEntry | null>(null);
  const [selectedForPrint, setSelectedForPrint] = useState<ShipmentEntry | null>(null);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState<boolean>(false);
  const [isReconcileDialogOpen, setIsReconcileDialogOpen] = useState<boolean>(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState<boolean>(false);
  const [isExportingExcel, setIsExportingExcel] = useState<boolean>(false);

  // ── TOAST NOTIFICATION ──
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 3500);
  };

  // ── FILTER STATE ──
  const [filters, setFilters] = useState<FilterState>({
    startDate: '',
    endDate: '',
    courier: 'ALL',
    search: '',
  });

  const handleResetFilter = () => {
    setFilters({
      startDate: '',
      endDate: '',
      courier: 'ALL',
      search: '',
    });
  };

  // ── SORT CONFIG ──
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'date',
    order: 'desc',
  });

  const handleSort = (field: SortField) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return {
          field,
          order: prev.order === 'asc' ? 'desc' : 'asc',
        };
      }
      return {
        field,
        order: field === 'amount' || field === 'date' || field === 'weight' ? 'desc' : 'asc',
      };
    });
  };

  // ── FILTERED SHIPMENTS ──
  const filteredShipments = useMemo(() => {
    return shipments.filter((item) => {
      // 1. Courier filter
      if (filters.courier !== 'ALL') {
        const itemType = item.serviceType.toUpperCase();
        if (filters.courier === 'JT' && !itemType.includes('J&T') && !itemType.includes('JT')) {
          return false;
        }
        if (filters.courier === 'JNE' && !itemType.includes('JNE')) {
          return false;
        }
      }

      // 2. Search filter (resi, sender, receiver, addresses)
      if (filters.search.trim()) {
        const query = filters.search.toLowerCase();
        const resiMatch = item.resiNumber.toLowerCase().includes(query);
        const senderMatch = item.senderName.toLowerCase().includes(query);
        const receiverMatch = item.receiverName.toLowerCase().includes(query);
        const senderAddrMatch = (item.senderAddress || '').toLowerCase().includes(query);
        const receiverAddrMatch = (item.receiverAddress || '').toLowerCase().includes(query);
        if (!resiMatch && !senderMatch && !receiverMatch && !senderAddrMatch && !receiverAddrMatch) {
          return false;
        }
      }

      // 3. Date range filter
      if (filters.startDate || filters.endDate) {
        const itemIsoDate = normalizeToISODate(item.date, item.createdAt);
        if (filters.startDate && itemIsoDate < filters.startDate) {
          return false;
        }
        if (filters.endDate && itemIsoDate > filters.endDate) {
          return false;
        }
      }

      return true;
    });
  }, [shipments, filters]);

  // ── SORTED SHIPMENTS ──
  const sortedShipments = useMemo(() => {
    const list = [...filteredShipments];
    const { field, order } = sortConfig;
    const factor = order === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      switch (field) {
        case 'date': {
          const dateA = normalizeToISODate(a.date, a.createdAt);
          const dateB = normalizeToISODate(b.date, b.createdAt);
          return dateA.localeCompare(dateB) * factor;
        }
        case 'resiNumber':
          return a.resiNumber.localeCompare(b.resiNumber) * factor;
        case 'senderName':
          return a.senderName.localeCompare(b.senderName) * factor;
        case 'receiverName':
          return a.receiverName.localeCompare(b.receiverName) * factor;
        case 'weight':
          return ((Number(a.weight) || 0) - (Number(b.weight) || 0)) * factor;
        case 'amount':
          return ((Number(a.amount) || 0) - (Number(b.amount) || 0)) * factor;
        default:
          return 0;
      }
    });

    return list;
  }, [filteredShipments, sortConfig]);

  // ── ACTIONS & HANDLERS ──

  // Add or Update Entry handler for EntryForm
  const handleSubmitEntry = async (
    data: Omit<ShipmentEntry, 'id'>,
    editId?: string
  ): Promise<ShipmentEntry | null> => {
    if (editId) {
      updateShipment(editId, data);
      showToast(`Manifest ${data.resiNumber} berhasil diperbarui.`);
      setEditingEntry(null);
      return { ...data, id: editId };
    } else {
      const newEntry = addShipment(data);
      showToast(`Manifest ${data.resiNumber} berhasil ditambahkan.`);
      return newEntry;
    }
  };

  // Delete Entry with Edge-case check for print dialog
  const handleConfirmDelete = (id: string) => {
    const deletedResi = entryToDelete?.resiNumber || 'Paket';
    deleteShipment(id);

    // Edge-case safeguard: If the deleted item is currently opened in print preview, close it
    if (selectedForPrint && selectedForPrint.id === id) {
      setSelectedForPrint(null);
    }

    setEntryToDelete(null);
    showToast(`Manifest ${deletedResi} berhasil dihapus.`);
  };

  // WhatsApp Notification Generator
  const handleSendWhatsApp = (entry: ShipmentEntry) => {
    const rawMessage = `Halo kak, paket atas nama ${entry.senderName} sudah kami proses dengan No. Resi: *${entry.resiNumber}*. Terima kasih!`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(rawMessage)}`;
    window.open(waUrl, '_blank');
  };

  // Reconcile Handler: matches against the whole dataset
  const handleReconcile = (resiMap: Map<string, string>): number => {
    const updated = reconcileAll(resiMap);
    showToast(`${updated} manifest berhasil direkonsiliasi dengan laporan J&T.`);
    return updated;
  };

  // Excel Export Handler (ALWAYS exports full dataset per requirement line 14)
  const handleExportExcel = async () => {
    if (shipments.length === 0) {
      showToast('Tidak ada data manifest untuk diekspor.');
      return;
    }

    setIsExportingExcel(true);
    try {
      // Export full dataset with monthly worksheets
      await exportPremiumExcel(shipments);
      showToast('Laporan Excel (Kas Reguler Bulanan) berhasil diunduh.');
    } catch (err) {
      console.error('[Janka] Failed to export via ExcelJS, attempting CSV fallback', err);
      try {
        exportToCSV(shipments);
        showToast('Diekspor sebagai CSV (fallback).');
      } catch (csvErr) {
        console.error('[Janka] CSV fallback export also failed', csvErr);
        alert('Gagal mengekspor data laporan.');
      }
    } finally {
      setIsExportingExcel(false);
    }
  };

  // Export JSON Backup handler
  const handleExportBackup = () => {
    if (shipments.length === 0) {
      showToast('Tidak ada data manifest untuk di-backup.');
      return;
    }
    exportBackupJSON(shipments, rates);
    showToast('File backup JSON (janka-backup-*.json) berhasil diunduh.');
  };

  // Restore JSON Backup handler
  const handleRestoreBackup = (newShipments: ShipmentEntry[], newRates: CourierRateConfig) => {
    return restoreBackup(newShipments, newRates);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#111827] font-sans antialiased">
      {/* ── TOP OPERATIONAL HEADER ── */}
      <header className="bg-white border-b border-[#D5D9E0] sticky top-0 z-30 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-[#1E293B] text-white px-2.5 py-1 font-mono font-bold tracking-wider text-sm rounded-[2px]">
              JANKA
            </div>
            <div>
              <h1 className="text-sm font-bold text-[#0F172A] leading-tight">
                Logistics Petty Cash Ledger — Kas Reguler
              </h1>
              <p className="text-[11px] text-[#64748B]">
                Pencatatan Manifest Paket, Tarif Ekspedisi, dan Buku Kas Operasional Reguler
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#475569] bg-[#F1F5F9] px-2.5 py-1 rounded-[2px] border border-[#E2E8F0]">
              <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse"></span>
              <span className="font-mono text-[11px] font-medium">Sistem Operasional Normal</span>
            </div>
          </div>
        </div>
      </header>

      {/* ── TOAST NOTIFICATION ── */}
      {toastMessage && (
        <div className="fixed top-14 right-4 z-50 bg-[#1E293B] text-white text-xs px-3.5 py-2 rounded-[2px] shadow-lg border border-[#334155] flex items-center gap-2 animate-fade-in">
          <span className="w-1.5 h-1.5 rounded-full bg-[#38BDF8]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── MAIN FLUID 2K WIDESCREEN CONTAINER ── */}
      <main className="max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-5">
        <div className="flex flex-col xl:flex-row gap-5 items-start">
          {/* LEFT COLUMN: Input Form Station (Sticky on Widescreen) */}
          <aside className="w-full xl:w-[420px] 2xl:w-[460px] shrink-0 sticky top-14 h-fit z-10">
            <EntryForm
              rates={rates}
              addressBook={addressBook}
              editingEntry={editingEntry}
              onCancelEdit={() => setEditingEntry(null)}
              onSubmitEntry={handleSubmitEntry}
              onPrintLabel={(entry) => setSelectedForPrint(entry)}
              onSendWhatsApp={handleSendWhatsApp}
            />
          </aside>

          {/* RIGHT COLUMN: Summary + FilterBar + LedgerTable (Fluid) */}
          <section className="flex-1 min-w-0 w-full space-y-4">
            {/* 1. Dashboard Summary Cards with Backup & Restore Buttons */}
            <DashboardSummary
              shipments={sortedShipments}
              rates={rates}
              onOpenRateSettings={() => setIsRateDialogOpen(true)}
              onExportBackup={handleExportBackup}
              onOpenRestore={() => setIsRestoreDialogOpen(true)}
            />

            {/* 2. Filter Controls & Actions Bar */}
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              onResetFilter={handleResetFilter}
              totalCount={shipments.length}
              filteredCount={sortedShipments.length}
              onExportExcel={handleExportExcel}
              isExporting={isExportingExcel}
              onOpenReconcile={() => setIsReconcileDialogOpen(true)}
              onOpenRates={() => setIsRateDialogOpen(true)}
            />

            {/* 3. Ledger Table */}
            <LedgerTable
              shipments={sortedShipments}
              allShipmentsCount={shipments.length}
              sortConfig={sortConfig}
              onSort={handleSort}
              onEdit={(entry) => {
                setEditingEntry(entry);
                window.scrollTo({ top: 100, behavior: 'smooth' });
              }}
              onDelete={(entry) => setEntryToDelete(entry)}
              onPrint={(entry) => setSelectedForPrint(entry)}
              onSendWhatsApp={handleSendWhatsApp}
              onResetFilter={handleResetFilter}
            />
          </section>
        </div>
      </main>

      {/* ── DIALOGS & MODALS ── */}

      {/* 1. Rate Settings Dialog */}
      <RateSettingsDialog
        isOpen={isRateDialogOpen}
        onClose={() => setIsRateDialogOpen(false)}
        rates={rates}
        onSaveRates={(newRates) => {
          updateRates(newRates);
          showToast('Tarif dasar kurir berhasil diperbarui.');
        }}
      />

      {/* 2. Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        isOpen={Boolean(entryToDelete)}
        entry={entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* 3. Thermal Print Label Dialog */}
      <PrintLabelDialog
        entry={selectedForPrint}
        onClose={() => setSelectedForPrint(null)}
        onSendWhatsApp={handleSendWhatsApp}
      />

      {/* 4. Nightly J&T Reconciliation Dialog */}
      <ReconcileDialog
        isOpen={isReconcileDialogOpen}
        onClose={() => setIsReconcileDialogOpen(false)}
        shipments={shipments}
        onApplyReconciliation={handleReconcile}
      />

      {/* 5. Backup & Restore JSON Dialog */}
      <BackupRestoreDialog
        isOpen={isRestoreDialogOpen}
        onClose={() => setIsRestoreDialogOpen(false)}
        currentShipmentsCount={shipments.length}
        onConfirmRestore={handleRestoreBackup}
        showToast={showToast}
      />
    </div>
  );
}
