import { useState, useMemo } from 'react';
import { useShipments } from './hooks/useShipments';
import { exportPremiumExcel, exportToCSV } from './lib/excel';
import { exportBackupJSON } from './lib/backup';
import { normalizeToISODate, formatRupiah } from './lib/formatters';
import {
  LayoutDashboard,
  FilePlus,
  BookOpen,
  Settings,
  PlusCircle,
  FileSpreadsheet,
  Menu,
  X,
  Truck,
  ShieldCheck,
  Database,
  ArrowRight,
  Clock,
  Printer,
  MessageCircle,
  CheckCircle2,
  Download,
  Upload,
  Edit2,
} from 'lucide-react';
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

type TabType = 'dashboard' | 'input' | 'ledger' | 'settings';

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

  // ── NAVIGATION & LAYOUT STATES ──
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState<boolean>(false);

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

  // ── HANDLERS ──
  const handleStartEdit = (entry: ShipmentEntry) => {
    setEditingEntry(entry);
    setActiveTab('input');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const handleConfirmDelete = (id: string) => {
    const deletedResi = entryToDelete?.resiNumber || 'Paket';
    deleteShipment(id);

    if (selectedForPrint && selectedForPrint.id === id) {
      setSelectedForPrint(null);
    }

    setEntryToDelete(null);
    showToast(`Manifest ${deletedResi} berhasil dihapus.`);
  };

  const handleSendWhatsApp = (entry: ShipmentEntry) => {
    const rawMessage = `Halo kak, paket atas nama ${entry.senderName} sudah kami proses dengan No. Resi: *${entry.resiNumber}*. Terima kasih!`;
    const waUrl = `https://wa.me/?text=${encodeURIComponent(rawMessage)}`;
    window.open(waUrl, '_blank');
  };

  const handleReconcile = (resiMap: Map<string, string>): number => {
    const updated = reconcileAll(resiMap);
    showToast(`${updated} manifest berhasil direkonsiliasi dengan laporan J&T.`);
    return updated;
  };

  const handleExportExcel = async () => {
    if (shipments.length === 0) {
      showToast('Tidak ada data manifest untuk diekspor.');
      return;
    }

    setIsExportingExcel(true);
    try {
      await exportPremiumExcel(shipments);
      showToast('Laporan Excel (Kas Reguler Bulanan) berhasil diunduh.');
    } catch (err) {
      console.error('[Janka] Failed to export via ExcelJS, attempting CSV fallback', err);
      try {
        exportToCSV(shipments);
        showToast('Diekspor sebagai CSV (fallback).');
      } catch (csvErr) {
        console.error('[Janka] CSV fallback export also failed', csvErr);
        showToast('Gagal mengekspor data laporan.');
      }
    } finally {
      setIsExportingExcel(false);
    }
  };

  const handleExportBackup = () => {
    if (shipments.length === 0) {
      showToast('Tidak ada data manifest untuk di-backup.');
      return;
    }
    exportBackupJSON(shipments, rates);
    showToast('File backup JSON (janka-backup-*.json) berhasil diunduh.');
  };

  const handleRestoreBackup = (newShipments: ShipmentEntry[], newRates: CourierRateConfig) => {
    return restoreBackup(newShipments, newRates);
  };

  // ── MENU ITEMS SPECIFICATION ──
  const menuItems = [
    {
      id: 'dashboard' as TabType,
      label: 'Dashboard & Analytics',
      icon: LayoutDashboard,
      badge: null,
      desc: 'Metrik summary & sparkline',
    },
    {
      id: 'input' as TabType,
      label: 'Input Manifest Paket',
      icon: FilePlus,
      badge: editingEntry ? 'Modus Edit' : null,
      desc: 'Form pencatatan & cetak label',
    },
    {
      id: 'ledger' as TabType,
      label: 'Buku Ledger Data',
      icon: BookOpen,
      badge: sortedShipments.length.toString(),
      desc: 'Tabel manifest & ekspor',
    },
    {
      id: 'settings' as TabType,
      label: 'Pengaturan & Alat',
      icon: Settings,
      badge: null,
      desc: 'Tarif, rekonsiliasi & backup',
    },
  ];

  return (
    <div className="min-h-screen bg-[#F5F6F8] text-[#0F172A] font-sans antialiased flex flex-col lg:flex-row">
      {/* ── 1. MOBILE TOP HEADER (< lg screen) ── */}
      <header className="lg:hidden sticky top-0 z-40 bg-white border-b border-[#D5D9E0] px-4 py-3 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Buka Menu Navigasi"
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-[2px] border border-[#CBD5E1] bg-[#F8FAFC] text-[#0F172A] hover:bg-[#F1F5F9] active:bg-[#E2E8F0]"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2">
            <div className="bg-[#0F172A] text-white px-2 py-0.5 font-mono font-bold tracking-wider text-xs rounded-[2px]">
              JANKA
            </div>
            <div>
              <h1 className="text-xs font-bold text-[#0F172A] leading-tight">Logistics Ledger</h1>
              <p className="text-[10px] text-[#475569]">Kas Reguler</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono font-semibold bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] px-2 py-1 rounded-[2px]">
            {activeTab === 'dashboard' && '📊 Dashboard'}
            {activeTab === 'input' && '📝 Input'}
            {activeTab === 'ledger' && '📖 Ledger'}
            {activeTab === 'settings' && '⚙️ Alat'}
          </span>
        </div>
      </header>

      {/* ── 2. MOBILE OFF-CANVAS DRAWER MENU (< lg screen) ── */}
      {isMobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Dark Backdrop */}
          <div
            className="fixed inset-0 bg-[#0F172A]/50 backdrop-blur-xs transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Drawer Content Panel */}
          <aside className="relative w-[280px] max-w-[85vw] bg-white border-r border-[#D5D9E0] h-full flex flex-col z-10 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="p-4 border-b border-[#D5D9E0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <div className="bg-[#0F172A] text-white px-2.5 py-1 font-mono font-bold tracking-wider text-sm rounded-[2px]">
                  JANKA
                </div>
                <span className="text-[10px] bg-[#E2E8F0] text-[#334155] px-1.5 py-0.5 rounded-[2px] font-mono font-semibold uppercase">
                  Kas Reguler
                </span>
              </div>

              <button
                type="button"
                aria-label="Tutup Menu"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-[#475569] hover:text-[#0F172A] rounded-[2px]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <nav className="p-3 space-y-1.5 flex-1 overflow-y-auto">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setIsMobileMenuOpen(false);
                    }}
                    className={`w-full min-h-[44px] p-3 rounded-[2px] flex items-center justify-between gap-3 text-left transition-colors border ${
                      isActive
                        ? 'bg-[#0F172A] text-white border-[#0F172A] font-bold shadow-xs'
                        : 'bg-white text-[#334155] hover:bg-[#F8FAFC] border-transparent hover:border-[#CBD5E1]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-[#38BDF8]' : 'text-[#475569]'}`} />
                      <div className="truncate">
                        <div className="text-xs font-semibold">{item.label}</div>
                        <div className={`text-[10px] ${isActive ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    {item.badge && (
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] shrink-0 font-bold ${
                          isActive ? 'bg-[#334155] text-white' : 'bg-[#E2E8F0] text-[#0F172A]'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Drawer Footer Status */}
            <div className="p-4 border-t border-[#D5D9E0] bg-[#F8FAFC] space-y-2">
              <div className="flex items-center gap-2 text-xs text-[#334155]">
                <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
                <span className="font-mono text-[11px] font-semibold">Sistem Operasional Normal</span>
              </div>
              <div className="text-[10px] font-mono text-[#64748B]">
                Total Manifest: <strong className="text-[#0F172A]">{shipments.length}</strong> record
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* ── 3. DESKTOP LEFT SIDEBAR NAVIGATION (>= lg screen) ── */}
      <aside className="hidden lg:flex lg:w-60 xl:w-64 2xl:w-64 lg:flex-col lg:fixed lg:inset-y-0 bg-white border-r border-[#D5D9E0] z-30">
        {/* Sidebar Brand Header */}
        <div className="p-3 2xl:p-3.5 border-b border-[#D5D9E0] bg-white">
          <div className="flex items-center gap-2.5">
            <div className="bg-[#0F172A] text-white px-2 py-1 font-mono font-bold tracking-wider text-xs 2xl:text-sm rounded-[2px] shadow-xs">
              JANKA
            </div>
            <div>
              <h1 className="text-xs 2xl:text-xs font-bold text-[#0F172A] leading-tight">Logistics Ledger</h1>
              <div className="inline-block text-[10px] bg-[#E2E8F0] text-[#334155] px-1.5 py-0.5 rounded-[2px] font-mono font-semibold uppercase mt-0.5">
                Kas Reguler
              </div>
            </div>
          </div>
          <p className="text-[10px] 2xl:text-[11px] text-[#475569] mt-1.5 leading-normal">
            Pencatatan Manifest Paket, Ekspedisi J&amp;T &amp; JNE, dan Buku Operasional
          </p>
        </div>

        {/* Sidebar Navigation Items */}
        <nav className="p-2.5 2xl:p-3 space-y-1 2xl:space-y-1.5 flex-1 overflow-y-auto">
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#64748B] px-2.5 pb-0.5 font-bold">
            NAVIGASI UTAMA
          </div>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                className={`w-full min-h-[36px] 2xl:min-h-[38px] p-2 2xl:p-2.5 rounded-[2px] flex items-center justify-between gap-2.5 text-left transition-all border ${
                  isActive
                    ? 'bg-[#0F172A] text-white border-[#0F172A] font-bold shadow-xs'
                    : 'bg-white text-[#334155] hover:bg-[#F8FAFC] border-transparent hover:border-[#CBD5E1]'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-3.5 h-3.5 2xl:w-4 2xl:h-4 shrink-0 ${isActive ? 'text-[#38BDF8]' : 'text-[#475569]'}`} />
                  <div className="truncate">
                    <div className="text-xs font-semibold leading-snug">{item.label}</div>
                    <div className={`text-[10px] truncate ${isActive ? 'text-[#94A3B8]' : 'text-[#64748B]'}`}>
                      {item.desc}
                    </div>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded-[2px] shrink-0 font-bold ${
                      isActive ? 'bg-[#334155] text-white' : 'bg-[#E2E8F0] text-[#0F172A]'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Bottom Footer Info */}
        <div className="p-2.5 2xl:p-3 border-t border-[#D5D9E0] bg-[#F8FAFC] space-y-1">
          <div className="flex items-center gap-1.5 text-xs text-[#334155]">
            <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
            <span className="font-mono text-[10px] font-bold">Status Operasional Normal</span>
          </div>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#64748B]">
            <span>Total Database:</span>
            <strong className="text-[#0F172A] font-bold">{shipments.length} Manifest</strong>
          </div>
        </div>
      </aside>

      {/* ── 4. MAIN CONTENT VIEW CONTAINER ── */}
      <div className="flex-1 lg:pl-60 xl:pl-64 2xl:pl-64 flex flex-col min-w-0">
        {/* Global Toast Notification */}
        {toastMessage && (
          <div className="fixed top-4 right-4 z-50 bg-[#0F172A] text-white text-xs px-4 py-2.5 rounded-[2px] shadow-lg border border-[#334155] flex items-center gap-2 animate-fade-in">
            <span className="w-2 h-2 rounded-full bg-[#38BDF8]" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        )}

        {/* Active Page View Switcher */}
        <main className="p-4 sm:p-6 lg:p-8 space-y-6 2xl:space-y-8 max-w-[1600px] 2xl:max-w-[1720px] w-full mx-auto pb-16 lg:pb-8">
          {/* VIEW A: 📊 DASHBOARD & ANALYTICS */}
          {activeTab === 'dashboard' && (
            <div className="space-y-6 2xl:space-y-8 animate-fade-in">
              {/* Header */}
              <div className="bg-white border border-[#D5D9E0] p-4 sm:p-5 2xl:p-6 rounded-[3px] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] 2xl:text-xs font-mono uppercase bg-[#E2E8F0] text-[#334155] px-2 py-0.5 rounded-[2px] font-semibold">
                      DASHBOARD METRICS
                    </span>
                    <span className="text-xs 2xl:text-sm text-[#64748B]">Real-time Overview</span>
                  </div>
                  <h1 className="text-base 2xl:text-xl font-bold text-[#0F172A] mt-1 flex items-center gap-2">
                    <LayoutDashboard className="w-5 2xl:w-6 h-5 2xl:h-6 text-[#2563EB]" />
                    Dashboard &amp; Analytics Operasional
                  </h1>
                  <p className="text-xs 2xl:text-sm text-[#475569] mt-0.5 2xl:mt-1">
                    Ringkasan statistik manifest, total pengeluaran kas reguler, performa ekspedisi J&amp;T vs JNE, dan tren harian.
                  </p>
                </div>
                <div className="flex items-center gap-2 2xl:gap-3 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setActiveTab('input')}
                    className="btn-hover-lift min-h-[44px] 2xl:min-h-[48px] px-4 2xl:px-5 py-2.5 2xl:py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs 2xl:text-sm font-bold rounded-[2px] flex items-center gap-2 shadow-xs"
                  >
                    <PlusCircle className="w-4 2xl:w-4.5 h-4 2xl:h-4.5" />
                    <span>+ Input Manifest Baru</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    className="btn-hover-lift min-h-[44px] 2xl:min-h-[48px] px-4 2xl:px-5 py-2.5 2xl:py-3 bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] text-xs 2xl:text-sm font-bold rounded-[2px] flex items-center gap-2 shadow-xs"
                  >
                    <BookOpen className="w-4 2xl:w-4.5 h-4 2xl:h-4.5" />
                    <span>Buka Buku Ledger</span>
                  </button>
                </div>
              </div>

              {/* Metrics Summary & Sparklines */}
              <section aria-label="Metrik Utama Ringkasan Kas" className="w-full">
                <DashboardSummary
                  shipments={sortedShipments}
                  rates={rates}
                  onOpenRateSettings={() => setIsRateDialogOpen(true)}
                  onExportBackup={handleExportBackup}
                  onOpenRestore={() => setIsRestoreDialogOpen(true)}
                />
              </section>

              {/* Quick Action Navigation Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 2xl:gap-6">
                <div className="bg-white border border-[#D5D9E0] p-4 2xl:p-5 rounded-[3px] shadow-xs flex flex-col justify-between space-y-3">
                  <div>
                    <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-[2px] bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center mb-2 border border-[#CBD5E1]">
                      <FilePlus className="w-4 h-4 2xl:w-5 2xl:h-5 text-[#2563EB]" />
                    </div>
                    <h3 className="text-xs 2xl:text-sm font-bold text-[#0F172A]">Stasiun Input Manifest</h3>
                    <p className="text-xs 2xl:text-sm text-[#64748B] mt-1 leading-snug">
                      Catat paket baru, hitung ongkir otomatis J&amp;T &amp; JNE, dan cetak label thermal 100x150mm secara langsung.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('input')}
                    className="mt-3 min-h-[38px] 2xl:min-h-[42px] w-full bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] text-xs 2xl:text-sm font-bold py-2 px-3 rounded-[2px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Ke Stasiun Input</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-white border border-[#D5D9E0] p-4 2xl:p-5 rounded-[3px] shadow-xs flex flex-col justify-between space-y-3">
                  <div>
                    <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-[2px] bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center mb-2 border border-[#CBD5E1]">
                      <BookOpen className="w-4 h-4 2xl:w-5 2xl:h-5 text-[#2563EB]" />
                    </div>
                    <h3 className="text-xs 2xl:text-sm font-bold text-[#0F172A]">Buku Ledger Data Paket</h3>
                    <p className="text-xs 2xl:text-sm text-[#64748B] mt-1 leading-snug">
                      Pencarian resi, filter tanggal &amp; kurir, audit data kas operasional, serta ekspor Excel 6-kolom (.xlsx).
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    className="mt-3 min-h-[38px] 2xl:min-h-[42px] w-full bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] text-xs 2xl:text-sm font-bold py-2 px-3 rounded-[2px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Lihat Ledger ({shipments.length} Data)</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                <div className="bg-white border border-[#D5D9E0] p-4 2xl:p-5 rounded-[3px] shadow-xs flex flex-col justify-between space-y-3">
                  <div>
                    <div className="w-8 h-8 2xl:w-9 2xl:h-9 rounded-[2px] bg-[#F1F5F9] text-[#0F172A] flex items-center justify-center mb-2 border border-[#CBD5E1]">
                      <Settings className="w-4 h-4 2xl:w-5 2xl:h-5 text-[#2563EB]" />
                    </div>
                    <h3 className="text-xs 2xl:text-sm font-bold text-[#0F172A]">Pengaturan &amp; Alat Audit</h3>
                    <p className="text-xs 2xl:text-sm text-[#64748B] mt-1 leading-snug">
                      Kelola tarif kurir, jalankan rekonsiliasi resi J&amp;T malam hari, dan backup/restore data JSON.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveTab('settings')}
                    className="mt-3 min-h-[38px] 2xl:min-h-[42px] w-full bg-[#F8FAFC] hover:bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] text-xs 2xl:text-sm font-bold py-2 px-3 rounded-[2px] flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <span>Buka Alat &amp; Pengaturan</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Pratinjau Manifest Terbaru (Recent 5 Entries) */}
              <div className="bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                  <h3 className="text-xs 2xl:text-sm font-bold text-[#0F172A] flex items-center gap-2">
                    <Clock className="w-4 h-4 2xl:w-5 2xl:h-5 text-[#2563EB]" />
                    5 Manifest Paket Terakhir
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    className="text-xs 2xl:text-sm text-[#2563EB] hover:underline font-bold flex items-center gap-1"
                  >
                    <span>Lihat Semua di Ledger</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>

                {shipments.length === 0 ? (
                  <div className="p-4 text-center text-xs 2xl:text-sm text-[#64748B] bg-[#F8FAFC] rounded-[2px] border border-dashed border-[#CBD5E1]">
                    Belum ada manifest terdaftar dalam sistem. Klik "+ Input Manifest Baru" untuk memulai pencatatan.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs 2xl:text-sm border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#D5D9E0] text-[#475569] font-mono text-xs 2xl:text-sm uppercase">
                          <th className="py-2.5 px-3">Tanggal</th>
                          <th className="py-2.5 px-3">No. Resi</th>
                          <th className="py-2.5 px-3">Pengirim &amp; Penerima</th>
                          <th className="py-2.5 px-3">Layanan</th>
                          <th className="py-2.5 px-3 text-right">Berat</th>
                          <th className="py-2.5 px-3 text-right">Jumlah</th>
                          <th className="py-2.5 px-3 text-center">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E2E8F0]">
                        {sortedShipments.slice(0, 5).map((item) => (
                          <tr key={item.id} className="hover:bg-[#F8FAFC]">
                            <td className="py-2.5 px-3 font-mono text-[#334155] whitespace-nowrap text-xs 2xl:text-sm">{item.date}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-[#0F172A] whitespace-nowrap text-xs 2xl:text-sm">{item.resiNumber}</td>
                            <td className="py-2.5 px-3 text-xs 2xl:text-sm">
                              <div className="font-semibold text-[#0F172A]">{item.senderName}</div>
                              <div className="text-xs 2xl:text-sm text-[#64748B]">Ke: {item.receiverName}</div>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[#334155] whitespace-nowrap text-xs 2xl:text-sm">{item.serviceType}</td>
                            <td className="py-2.5 px-3 font-mono text-right whitespace-nowrap text-xs 2xl:text-sm">{item.weight} kg</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-right text-[#0F172A] whitespace-nowrap text-xs 2xl:text-sm">
                              {formatRupiah(item.amount)}
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedForPrint(item)}
                                  title="Cetak Label Thermal"
                                  className="p-1.5 2xl:p-2 hover:bg-[#E2E8F0] rounded-[2px] text-[#334155]"
                                >
                                  <Printer className="w-4 h-4 2xl:w-4.5 2xl:h-4.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(item)}
                                  title="Edit Manifest"
                                  className="p-1.5 2xl:p-2 hover:bg-[#E2E8F0] rounded-[2px] text-[#334155]"
                                >
                                  <Edit2 className="w-4 h-4 2xl:w-4.5 2xl:h-4.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VIEW B: 📝 INPUT MANIFEST PAKET */}
          {activeTab === 'input' && (
            <div className="space-y-6 2xl:space-y-8 animate-fade-in">
              {/* Header */}
              <div className="bg-white border border-[#D5D9E0] p-4 sm:p-5 2xl:p-6 rounded-[3px] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] 2xl:text-xs font-mono uppercase bg-[#0F172A] text-white px-2 py-0.5 rounded-[2px] font-semibold">
                      STASIUN INPUT MANIFEST
                    </span>
                    {editingEntry && (
                      <span className="text-xs 2xl:text-sm bg-[#FEF3C7] text-[#92400E] border border-[#FCD34D] px-2 py-0.5 rounded-[2px] font-mono font-bold">
                        MODUS EDIT TERPASANG
                      </span>
                    )}
                  </div>
                  <h1 className="text-xl 2xl:text-2xl 3xl:text-3xl font-bold text-[#0F172A] mt-1 flex items-center gap-2">
                    <FilePlus className="w-5 2xl:w-6 h-5 2xl:h-6 text-[#2563EB]" />
                    Input Manifest Paket & Cetak Label
                  </h1>
                  <p className="text-xs 2xl:text-sm text-[#475569] mt-0.5 2xl:mt-1">
                    Form pencatatan resi pengiriman, kalkulasi otomatis tarif ongkir J&T / JNE, dan pencetakan label thermal 100x150mm.
                  </p>
                </div>

                <div className="flex items-center gap-2 2xl:gap-3">
                  {editingEntry && (
                    <button
                      type="button"
                      onClick={() => setEditingEntry(null)}
                      className="min-h-[44px] 2xl:min-h-[48px] px-3.5 2xl:px-4 py-2 2xl:py-2.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#0F172A] border border-[#CBD5E1] text-xs 2xl:text-sm font-bold rounded-[2px]"
                    >
                      Batal Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setActiveTab('ledger')}
                    className="btn-hover-lift min-h-[44px] 2xl:min-h-[48px] px-4 2xl:px-5 py-2.5 2xl:py-3 bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] text-xs 2xl:text-sm font-bold rounded-[2px] flex items-center gap-2 shadow-xs"
                  >
                    <BookOpen className="w-4 2xl:w-4.5 h-4 2xl:h-4.5" />
                    <span>Buka Buku Ledger ({shipments.length})</span>
                  </button>
                </div>
              </div>

              {/* Focused Split View */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 2xl:gap-8 3xl:gap-10 items-start">
                {/* Form Input Station (Lg: 7-8 cols) */}
                <div className="lg:col-span-7 xl:col-span-8 min-w-0 space-y-4 2xl:space-y-6">
                  <EntryForm
                    rates={rates}
                    addressBook={addressBook}
                    editingEntry={editingEntry}
                    onCancelEdit={() => setEditingEntry(null)}
                    onSubmitEntry={handleSubmitEntry}
                    onPrintLabel={(entry) => setSelectedForPrint(entry)}
                    onSendWhatsApp={handleSendWhatsApp}
                  />
                </div>

                {/* Secondary Information & Recent Logged Entries (Lg: 4-5 cols) */}
                <div className="lg:col-span-5 xl:col-span-4 min-w-0 space-y-4 2xl:space-y-6">
                  {/* Operational Quick Guide */}
                  <div className="bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-6 shadow-xs space-y-3 2xl:space-y-4">
                    <h3 className="text-xs 2xl:text-sm font-bold uppercase tracking-wider text-[#0F172A] font-mono border-b border-[#E2E8F0] pb-2 2xl:pb-3 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 2xl:w-5 h-4 2xl:h-5 text-[#16A34A]" />
                      Petunjuk Cepat Pencatatan
                    </h3>
                    <ul className="text-xs 2xl:text-sm text-[#475569] space-y-2.5 2xl:space-y-3 leading-relaxed">
                      <li className="flex items-start gap-2">
                        <span className="font-mono text-[11px] 2xl:text-xs font-bold bg-[#F1F5F9] text-[#0F172A] px-1.5 py-0.5 rounded-[2px]">1</span>
                        <span>Ketik nama pengirim untuk menampilkan autocomplete dari <strong>Buku Alamat</strong>.</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-mono text-[11px] 2xl:text-xs font-bold bg-[#F1F5F9] text-[#0F172A] px-1.5 py-0.5 rounded-[2px]">2</span>
                        <span>Tarif dihitung otomatis berdasarkan berat (kg) & jenis layanan kurir (J&T / JNE).</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <span className="font-mono text-[11px] 2xl:text-xs font-bold bg-[#F1F5F9] text-[#0F172A] px-1.5 py-0.5 rounded-[2px]">3</span>
                        <span>Gunakan tombol <strong>Cetak Label Thermal</strong> (100x150mm) atau kirim notifikasi WhatsApp langsung ke pengirim.</span>
                      </li>
                    </ul>
                  </div>

                  {/* Recent Logged Entries */}
                  <div className="bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-6 shadow-xs space-y-3 2xl:space-y-4">
                    <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2 2xl:pb-3">
                      <h3 className="text-xs 2xl:text-sm font-bold uppercase tracking-wider text-[#0F172A] font-mono flex items-center gap-1.5">
                        <Clock className="w-4 2xl:w-5 h-4 2xl:h-5 text-[#2563EB]" />
                        Manifest Terakhir Diinput
                      </h3>
                      <span className="text-[10px] 2xl:text-xs font-mono text-[#64748B]">{shipments.length} Total</span>
                    </div>

                    {shipments.length === 0 ? (
                      <p className="text-xs 2xl:text-sm text-[#64748B] py-4 text-center">Belum ada data manifest.</p>
                    ) : (
                      <div className="space-y-2.5 2xl:space-y-3">
                        {sortedShipments.slice(0, 4).map((entry) => (
                          <div
                            key={entry.id}
                            className="p-2.5 2xl:p-3 bg-[#F8FAFC] border border-[#E2E8F0] rounded-[2px] flex items-center justify-between gap-2 hover:bg-[#F1F5F9] transition-colors"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs 2xl:text-sm text-[#0F172A] truncate">
                                  {entry.resiNumber}
                                </span>
                                <span className="text-[10px] 2xl:text-xs font-mono bg-[#E2E8F0] text-[#334155] px-1 rounded-[2px]">
                                  {entry.serviceType}
                                </span>
                              </div>
                              <div className="text-[11px] 2xl:text-xs text-[#475569] truncate mt-0.5">
                                {entry.senderName} &rarr; {entry.receiverName}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedForPrint(entry)}
                                className="p-1.5 2xl:p-2 bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#0F172A] rounded-[2px] text-xs"
                                title="Cetak Label Thermal"
                              >
                                <Printer className="w-3.5 2xl:w-4 h-3.5 2xl:h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleSendWhatsApp(entry)}
                                className="p-1.5 2xl:p-2 bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] text-[#16A34A] rounded-[2px] text-xs"
                                title="Kirim Notifikasi WA"
                              >
                                <MessageCircle className="w-3.5 2xl:w-4 h-3.5 2xl:h-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      type="button"
                      onClick={() => setActiveTab('ledger')}
                      className="w-full text-center text-xs 2xl:text-sm font-bold text-[#2563EB] hover:underline pt-1 block"
                    >
                      Lihat Semua Data di Buku Ledger &rarr;
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* VIEW C: 📖 BUKU LEDGER / DATA MANIFEST */}
          {activeTab === 'ledger' && (
            <div className="space-y-5 2xl:space-y-7 animate-fade-in">
              {/* Header */}
              <div className="bg-white border border-[#D5D9E0] p-4 sm:p-5 2xl:p-6 rounded-[3px] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] 2xl:text-xs font-mono uppercase bg-[#0F172A] text-white px-2 py-0.5 rounded-[2px] font-semibold">
                      BUKU LEDGER DATA
                    </span>
                    <span className="text-xs 2xl:text-sm text-[#64748B]">Kas Reguler Operasional</span>
                  </div>
                  <h1 className="text-xl 2xl:text-2xl 3xl:text-3xl font-bold text-[#0F172A] mt-1 flex items-center gap-2">
                    <BookOpen className="w-5 2xl:w-6 h-5 2xl:h-6 text-[#2563EB]" />
                    Buku Ledger & Data Manifest Paket
                  </h1>
                  <p className="text-xs 2xl:text-sm text-[#475569] mt-0.5 2xl:mt-1">
                    Tabel lengkap manifest paket, pencarian cepat resi/pengirim, filter tanggal & kurir, serta ekspor laporan Excel (.xlsx).
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('input')}
                    className="btn-hover-lift min-h-[44px] 2xl:min-h-[48px] px-4 2xl:px-5 py-2.5 2xl:py-3 bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs 2xl:text-sm font-bold rounded-[2px] flex items-center gap-2 shadow-xs"
                  >
                    <PlusCircle className="w-4 2xl:w-4.5 h-4 2xl:h-4.5" />
                    <span>+ Tambah Manifest Baru</span>
                  </button>
                </div>
              </div>

              {/* Filter Bar Controls */}
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

              {/* Interactive Ledger Table */}
              <LedgerTable
                shipments={sortedShipments}
                allShipmentsCount={shipments.length}
                sortConfig={sortConfig}
                onSort={handleSort}
                onEdit={handleStartEdit}
                onDelete={(entry) => setEntryToDelete(entry)}
                onPrint={(entry) => setSelectedForPrint(entry)}
                onSendWhatsApp={handleSendWhatsApp}
                onResetFilter={handleResetFilter}
              />
            </div>
          )}

          {/* VIEW D: ⚙️ PENGATURAN & ALAT */}
          {activeTab === 'settings' && (
            <div className="space-y-6 2xl:space-y-8 animate-fade-in">
              {/* Header */}
              <div className="bg-white border border-[#D5D9E0] p-4 sm:p-5 2xl:p-6 rounded-[3px] shadow-xs">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] 2xl:text-xs font-mono uppercase bg-[#0F172A] text-white px-2 py-0.5 rounded-[2px] font-semibold">
                    KONFIGURASI & ALAT
                  </span>
                  <span className="text-xs 2xl:text-sm text-[#64748B]">Pemeliharaan Data System</span>
                </div>
                <h1 className="text-xl 2xl:text-2xl 3xl:text-3xl font-bold text-[#0F172A] mt-1 flex items-center gap-2">
                  <Settings className="w-5 2xl:w-6 h-5 2xl:h-6 text-[#2563EB]" />
                  Pengaturan & Alat Operasional
                </h1>
                <p className="text-xs 2xl:text-sm text-[#475569] mt-0.5 2xl:mt-1">
                  Kelola tarif dasar kurir ekspedisi, jalankan rekonsiliasi malam laporan J&T, serta unduh atau pulihkan backup JSON.
                </p>
              </div>

              {/* Grid 4 Tool Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 2xl:gap-7 3xl:gap-8">
                {/* Panel 1: Tarif Dasar Kurir */}
                <div className="bg-white border border-[#D5D9E0] p-5 2xl:p-7 3xl:p-8 rounded-[3px] shadow-xs flex flex-col justify-between space-y-4 2xl:space-y-6">
                  <div className="space-y-3 2xl:space-y-4">
                    <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-3 2xl:pb-4">
                      <div className="p-2.5 2xl:p-3 bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] rounded-[2px]">
                        <Truck className="w-5 2xl:w-6 h-5 2xl:h-6 text-[#2563EB]" />
                      </div>
                      <div>
                        <h3 className="text-sm 2xl:text-base font-bold text-[#0F172A]">Tarif Dasar Kurir Ekspedisi</h3>
                        <p className="text-xs 2xl:text-sm text-[#64748B]">Biaya per kg untuk J&T (EZ) dan JNE (REG / YES)</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 2xl:gap-4 bg-[#F8FAFC] p-3 2xl:p-4 rounded-[2px] border border-[#E2E8F0]">
                      <div>
                        <div className="text-[10px] 2xl:text-xs font-mono uppercase text-[#64748B]">J&T EKSPRES</div>
                        <div className="text-xs 2xl:text-sm font-mono font-bold text-[#0F172A]">
                          {formatRupiah(rates.JT)} /kg
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] 2xl:text-xs font-mono uppercase text-[#64748B]">JNE REGULER</div>
                        <div className="text-xs 2xl:text-sm font-mono font-bold text-[#0F172A]">
                          {formatRupiah(rates.JNE)} /kg
                        </div>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRateDialogOpen(true)}
                    className="btn-hover-lift min-h-[44px] 2xl:min-h-[48px] w-full bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs 2xl:text-sm font-bold py-2.5 2xl:py-3 px-4 rounded-[2px] flex items-center justify-center gap-2 shadow-xs"
                  >
                    <Settings className="w-4 2xl:w-4.5 h-4 2xl:h-4.5" />
                    <span>Kelola & Ubah Tarif Kurir</span>
                  </button>
                </div>

                {/* Panel 2: Rekonsiliasi Malam J&T */}
                <div className="bg-white border border-[#D5D9E0] p-5 2xl:p-7 3xl:p-8 rounded-[3px] shadow-xs flex flex-col justify-between space-y-4 2xl:space-y-6">
                  <div className="space-y-3 2xl:space-y-4">
                    <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-3 2xl:pb-4">
                      <div className="p-2.5 2xl:p-3 bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] rounded-[2px]">
                        <ShieldCheck className="w-5 2xl:w-6 h-5 2xl:h-6 text-[#16A34A]" />
                      </div>
                      <div>
                        <h3 className="text-sm 2xl:text-base font-bold text-[#0F172A]">Rekonsiliasi Malam J&T</h3>
                        <p className="text-xs 2xl:text-sm text-[#64748B]">Pencocokan laporan resi harian dari ekspedisi J&T</p>
                      </div>
                    </div>

                    <p className="text-xs 2xl:text-sm text-[#475569] leading-relaxed">
                      Tempelkan atau upload laporan nomor resi J&T untuk mencocokkan data manifest lokal. Sistem akan menandai paket yang sudah sesuai secara otomatis.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsReconcileDialogOpen(true)}
                    className="btn-hover-lift min-h-[44px] 2xl:min-h-[48px] w-full bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] text-xs 2xl:text-sm font-bold py-2.5 2xl:py-3 px-4 rounded-[2px] flex items-center justify-center gap-2 shadow-xs"
                  >
                    <ShieldCheck className="w-4 2xl:w-4.5 h-4 2xl:h-4.5 text-[#16A34A]" />
                    <span>Buka Dialog Rekonsiliasi J&T</span>
                  </button>
                </div>

                {/* Panel 3: Backup & Pemulihan Data JSON */}
                <div className="bg-white border border-[#D5D9E0] p-5 2xl:p-7 3xl:p-8 rounded-[3px] shadow-xs flex flex-col justify-between space-y-4 2xl:space-y-6">
                  <div className="space-y-3 2xl:space-y-4">
                    <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-3 2xl:pb-4">
                      <div className="p-2.5 2xl:p-3 bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] rounded-[2px]">
                        <Database className="w-5 2xl:w-6 h-5 2xl:h-6 text-[#2563EB]" />
                      </div>
                      <div>
                        <h3 className="text-sm 2xl:text-base font-bold text-[#0F172A]">Backup & Pemulihan Data JSON</h3>
                        <p className="text-xs 2xl:text-sm text-[#64748B]">Ekspor cadangan penuh atau restore dari file JSON</p>
                      </div>
                    </div>

                    <p className="text-xs 2xl:text-sm text-[#475569] leading-relaxed">
                      Simpan cadangan lokal data manifest ({shipments.length} records) dan konfigurasi tarif ke format JSON safe backup.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 2xl:gap-3">
                    <button
                      type="button"
                      onClick={handleExportBackup}
                      className="btn-hover-lift min-h-[44px] 2xl:min-h-[48px] bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] text-xs 2xl:text-sm font-bold py-2 2xl:py-2.5 px-3 rounded-[2px] flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Download className="w-3.5 2xl:w-4 h-3.5 2xl:h-4" />
                      <span>Unduh Backup</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsRestoreDialogOpen(true)}
                      className="btn-hover-lift min-h-[44px] 2xl:min-h-[48px] bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] text-xs 2xl:text-sm font-bold py-2 2xl:py-2.5 px-3 rounded-[2px] flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Upload className="w-3.5 2xl:w-4 h-3.5 2xl:h-4" />
                      <span>Restore Backup</span>
                    </button>
                  </div>
                </div>

                {/* Panel 4: Ekspor Laporan Excel & CSV */}
                <div className="bg-white border border-[#D5D9E0] p-5 2xl:p-7 3xl:p-8 rounded-[3px] shadow-xs flex flex-col justify-between space-y-4 2xl:space-y-6">
                  <div className="space-y-3 2xl:space-y-4">
                    <div className="flex items-center gap-3 border-b border-[#E2E8F0] pb-3 2xl:pb-4">
                      <div className="p-2.5 2xl:p-3 bg-[#F1F5F9] text-[#0F172A] border border-[#CBD5E1] rounded-[2px]">
                        <FileSpreadsheet className="w-5 2xl:w-6 h-5 2xl:h-6 text-[#16A34A]" />
                      </div>
                      <div>
                        <h3 className="text-sm 2xl:text-base font-bold text-[#0F172A]">Ekspor Laporan Kas Reguler</h3>
                        <p className="text-xs 2xl:text-sm text-[#64748B]">Unduh spreadsheet resmi 6-kolom per bulan</p>
                      </div>
                    </div>

                    <p className="text-xs 2xl:text-sm text-[#475569] leading-relaxed">
                      Laporan Excel tersusun otomatis per lembar kerja bulanan (KAS REGULER) dengan rumus `=SUM(...)` native.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 2xl:gap-3">
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      disabled={isExportingExcel || shipments.length === 0}
                      className={`btn-hover-lift min-h-[44px] 2xl:min-h-[48px] text-xs 2xl:text-sm font-bold py-2 2xl:py-2.5 px-3 rounded-[2px] flex items-center justify-center gap-1.5 shadow-xs border ${
                        isExportingExcel
                          ? 'animate-shimmer text-white border-[#334155]'
                          : 'bg-[#0F172A] hover:bg-[#1E293B] text-white border-transparent'
                      }`}
                    >
                      <FileSpreadsheet className="w-3.5 2xl:w-4 h-3.5 2xl:h-4" />
                      <span>{isExportingExcel ? 'Mengekspor...' : 'Ekspor Excel'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (shipments.length === 0) {
                          showToast('Tidak ada data manifest untuk diekspor.');
                          return;
                        }
                        exportToCSV(shipments);
                        showToast('Laporan CSV berhasil diunduh.');
                      }}
                      disabled={shipments.length === 0}
                      className="btn-hover-lift min-h-[44px] 2xl:min-h-[48px] bg-white hover:bg-[#F8FAFC] text-[#0F172A] border border-[#CBD5E1] text-xs 2xl:text-sm font-bold py-2 2xl:py-2.5 px-3 rounded-[2px] flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Download className="w-3.5 2xl:w-4 h-3.5 2xl:h-4" />
                      <span>Ekspor CSV</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* ── 5. DIALOGS & MODALS ── */}
      <RateSettingsDialog
        isOpen={isRateDialogOpen}
        onClose={() => setIsRateDialogOpen(false)}
        rates={rates}
        onSaveRates={(newRates) => {
          updateRates(newRates);
          showToast('Tarif dasar kurir berhasil diperbarui.');
        }}
      />

      <DeleteConfirmDialog
        isOpen={Boolean(entryToDelete)}
        entry={entryToDelete}
        onClose={() => setEntryToDelete(null)}
        onConfirmDelete={handleConfirmDelete}
      />

      <PrintLabelDialog
        entry={selectedForPrint}
        onClose={() => setSelectedForPrint(null)}
        onSendWhatsApp={handleSendWhatsApp}
      />

      <ReconcileDialog
        isOpen={isReconcileDialogOpen}
        onClose={() => setIsReconcileDialogOpen(false)}
        shipments={shipments}
        onApplyReconciliation={handleReconcile}
      />

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
