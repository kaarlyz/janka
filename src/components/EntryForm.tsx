import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  BookUser,
  Check,
  Printer,
  MessageCircle,
  AlertCircle,
  Edit3,
  X,
  ChevronDown,
  ChevronUp,
  Tag,
  CreditCard,
  Calendar,
} from 'lucide-react';
import { ShipmentEntry, CourierCode, CourierRateConfig } from '../types';
import { formatRupiah, getTodayISODate, normalizeToISODate } from '../lib/formatters';

interface EntryFormProps {
  rates: CourierRateConfig;
  addressBook: { name: string; address: string }[];
  editingEntry: ShipmentEntry | null;
  onCancelEdit: () => void;
  onSubmitEntry: (entry: Omit<ShipmentEntry, 'id'>, editId?: string) => Promise<ShipmentEntry | null>;
  onPrintLabel: (entry: ShipmentEntry) => void;
  onSendWhatsApp: (entry: ShipmentEntry) => void;
}

export const EntryForm: React.FC<EntryFormProps> = ({
  rates,
  addressBook,
  editingEntry,
  onCancelEdit,
  onSubmitEntry,
  onPrintLabel,
  onSendWhatsApp,
}) => {
  // Main Petty Cash Sheet Form Fields
  const [courier, setCourier] = useState<CourierCode>('JT');
  const [dateIso, setDateIso] = useState<string>(getTodayISODate());
  const [senderName, setSenderName] = useState<string>('Gudang Pusat Jakarta');
  const [senderAddress, setSenderAddress] = useState<string>('Jl. Cakung Cilincing Km. 4, Jakarta Timur');
  const [serviceType, setServiceType] = useState<string>('REGULER');
  const [paymentType, setPaymentType] = useState<string>('CASH');

  // Data Label (Cetak Resi Thermal) - Collapsible Section
  const [isLabelSectionOpen, setIsLabelSectionOpen] = useState<boolean>(true);
  const [receiverName, setReceiverName] = useState<string>('');
  const [receiverAddress, setReceiverAddress] = useState<string>('');
  const [weight, setWeight] = useState<string>('1.0');

  // Manual amount override state
  const [isManualAmount, setIsManualAmount] = useState<boolean>(false);
  const [manualAmountStr, setManualAmountStr] = useState<string>('');

  // UI helpers
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [lastLoggedEntry, setLastLoggedEntry] = useState<ShipmentEntry | null>(null);
  const [isSenderDropdownOpen, setIsSenderDropdownOpen] = useState<boolean>(false);

  // Sync when entering or exiting edit mode
  useEffect(() => {
    if (editingEntry) {
      const isJt = editingEntry.serviceType.includes('J&T') || editingEntry.resiNumber.startsWith('JT');
      setCourier(isJt ? 'JT' : 'JNE');
      setSenderName(editingEntry.senderName || 'Gudang Pusat Jakarta');
      setSenderAddress(editingEntry.senderAddress || '');
      setReceiverName(editingEntry.receiverName || '');
      setReceiverAddress(editingEntry.receiverAddress || '');
      setWeight(String(editingEntry.weight || 1.0));

      // Standardize serviceType options: 'REGULER' | 'REGULER (DFOD)'
      const st = editingEntry.serviceType.toUpperCase();
      if (st.includes('DFOD')) {
        setServiceType('REGULER (DFOD)');
      } else {
        setServiceType('REGULER');
      }

      // Standardize paymentType options: 'CASH' | 'BCA' | 'BRI' | 'MANDIRI'
      const pt = (editingEntry.paymentType || 'CASH').toUpperCase();
      if (['CASH', 'BCA', 'BRI', 'MANDIRI'].includes(pt)) {
        setPaymentType(pt);
      } else {
        setPaymentType('CASH');
      }

      setDateIso(normalizeToISODate(editingEntry.date, editingEntry.createdAt) || getTodayISODate());

      // Check if amount was manual or auto
      const autoCalc = Math.ceil(editingEntry.weight || 1.0) * rates[isJt ? 'JT' : 'JNE'];
      if (editingEntry.amount !== autoCalc) {
        setIsManualAmount(true);
        setManualAmountStr(String(editingEntry.amount));
      } else {
        setIsManualAmount(false);
        setManualAmountStr('');
      }
      setValidationError(null);
    } else {
      // Reset to default
      setReceiverName('');
      setReceiverAddress('');
      setWeight('1.0');
      setServiceType('REGULER');
      setPaymentType('CASH');
      setIsManualAmount(false);
      setManualAmountStr('');
      setDateIso(getTodayISODate());
      setValidationError(null);
    }
  }, [editingEntry, rates]);

  // Address book autocomplete filter
  const filteredSenders = useMemo(() => {
    const q = senderName.trim().toLowerCase();
    if (!q) return addressBook;
    return addressBook.filter((s) => s.name.toLowerCase().includes(q));
  }, [addressBook, senderName]);

  // Rate Calculation
  const parsedWeight = parseFloat(weight);
  const autoOngkir = useMemo(() => {
    if (isNaN(parsedWeight) || parsedWeight <= 0) return 0;
    const ratePerKg = rates[courier] || (courier === 'JT' ? 12000 : 10000);
    return Math.ceil(parsedWeight) * ratePerKg;
  }, [parsedWeight, courier, rates]);

  const effectiveAmount = useMemo(() => {
    if (isManualAmount) {
      const parsedManual = parseInt(manualAmountStr, 10);
      return !isNaN(parsedManual) && parsedManual >= 0 ? parsedManual : autoOngkir;
    }
    return autoOngkir;
  }, [isManualAmount, manualAmountStr, autoOngkir]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validation 1: Date must be valid
    if (!dateIso) {
      setValidationError('Tanggal entri wajib dipilih.');
      return;
    }

    // Validation 2: Weight must be > 0
    if (isNaN(parsedWeight) || parsedWeight <= 0) {
      setValidationError('Berat paket harus lebih besar dari 0 kg (tidak boleh 0 atau negatif).');
      return;
    }

    // Validation 3: Amount
    if (effectiveAmount < 0) {
      setValidationError('Biaya ongkir tidak boleh bernilai negatif.');
      return;
    }

    setIsLoading(true);

    try {
      let resiNumber = editingEntry?.resiNumber;
      if (!resiNumber) {
        const randomSuffix = Math.floor(1000000 + Math.random() * 9000000);
        resiNumber = `${courier}2026${randomSuffix}`;
      }

      const payload: Omit<ShipmentEntry, 'id'> = {
        date: dateIso, // ISO YYYY-MM-DD
        resiNumber,
        senderName: senderName.trim() || 'Logistics Admin',
        senderAddress: senderAddress.trim() || 'Warehouse Hub',
        receiverName: receiverName.trim() || 'Penerima Direct',
        receiverAddress: receiverAddress.trim() || '-',
        weight: parsedWeight,
        serviceType: serviceType, // e.g. 'REGULER' or 'REGULER (DFOD)'
        amount: effectiveAmount,
        paymentType: paymentType, // e.g. 'CASH', 'BCA', 'BRI', 'MANDIRI'
        createdAt: editingEntry?.createdAt || new Date().toISOString(),
      };

      const result = await onSubmitEntry(payload, editingEntry?.id);
      if (result) {
        setLastLoggedEntry(result);
        if (!editingEntry) {
          setReceiverName('');
          setReceiverAddress('');
          setWeight('1.0');
          setIsManualAmount(false);
          setManualAmountStr('');
        }
      }
    } catch (err) {
      console.error('[Janka] Form submission error:', err);
      setValidationError('Terjadi kesalahan saat menyimpan manifest.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="entry-form-container" className="bg-white border border-[#D5D9E0] rounded-[3px] shadow-sm overflow-hidden">
      {/* Header Form */}
      <div className="bg-[#F8FAFC] border-b border-[#D5D9E0] px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-[#0F172A]" />
          <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
            {editingEntry ? `Edit Manifest: ${editingEntry.resiNumber}` : 'Stasiun Input Manifest Kas Reguler'}
          </h2>
        </div>
        {editingEntry && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="btn-hover-lift inline-flex items-center gap-1 text-[11px] min-h-[32px] px-2.5 py-1 text-[#DC2626] bg-red-50 hover:bg-red-100 border border-red-200 rounded-[2px] font-medium transition-all"
          >
            <X className="w-3.5 h-3.5" />
            Batal Edit
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Error Alert */}
        {validationError && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs px-3.5 py-2.5 rounded-[2px] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span className="font-medium">{validationError}</span>
          </div>
        )}

        {/* ── ROW 1: Kurir Selection & Tanggal ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Kurir selector */}
          <div>
            <label className="block text-xs font-semibold text-[#334155] mb-1">
              Pilihan Kurir <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="entry-courier-jt"
                onClick={() => setCourier('JT')}
                className={`min-h-[44px] px-3 text-xs font-bold border rounded-[2px] transition-all flex items-center justify-center gap-1.5 btn-hover-lift ${
                  courier === 'JT'
                    ? 'bg-[#FEF2F2] text-[#991B1B] border-[#EF4444]'
                    : 'bg-white text-[#475569] border-[#D5D9E0] hover:bg-[#F8FAFC]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                J&T Express
              </button>
              <button
                type="button"
                id="entry-courier-jne"
                onClick={() => setCourier('JNE')}
                className={`min-h-[44px] px-3 text-xs font-bold border rounded-[2px] transition-all flex items-center justify-center gap-1.5 btn-hover-lift ${
                  courier === 'JNE'
                    ? 'bg-[#EFF6FF] text-[#1E40AF] border-[#3B82F6]'
                    : 'bg-white text-[#475569] border-[#D5D9E0] hover:bg-[#F8FAFC]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-[#3B82F6]" />
                JNE Express
              </button>
            </div>
          </div>

          {/* Tanggal Entri */}
          <div>
            <label htmlFor="entry-date" className="block text-xs font-semibold text-[#334155] mb-1">
              Tanggal Transaksi <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="entry-date"
                type="date"
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
                required
                className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs font-mono bg-[#F9FAFB] border border-[#D5D9E0] rounded-[2px] text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors"
              />
            </div>
          </div>
        </div>

        {/* ── ROW 2: Pengirim & Buku Alamat ── */}
        <div className="relative">
          <div className="flex items-center justify-between mb-1">
            <label htmlFor="entry-sender-name" className="text-xs font-semibold text-[#334155]">
              Nama Pengirim (Seller / Subgudang) <span className="text-red-500">*</span>
            </label>
            {addressBook.length > 0 && (
              <button
                type="button"
                onClick={() => setIsSenderDropdownOpen(!isSenderDropdownOpen)}
                className="btn-hover-lift text-xs text-[#2563EB] hover:underline inline-flex items-center gap-1 py-1"
              >
                <BookUser className="w-3.5 h-3.5" />
                Buku Alamat ({addressBook.length})
              </button>
            )}
          </div>
          <input
            id="entry-sender-name"
            type="text"
            value={senderName}
            onChange={(e) => {
              setSenderName(e.target.value);
              setIsSenderDropdownOpen(false);
            }}
            placeholder="Contoh: Gudang Pusat Jakarta / Official Store"
            required
            className="w-full min-h-[44px] px-3 py-2 text-xs bg-[#F9FAFB] border border-[#D5D9E0] rounded-[2px] text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors"
          />

          {/* Address Book Dropdown */}
          {isSenderDropdownOpen && filteredSenders.length > 0 && (
            <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-white border border-[#CBD5E1] rounded-[2px] shadow-lg max-h-48 overflow-y-auto divide-y divide-[#F1F5F9]">
              {filteredSenders.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSenderName(item.name);
                    if (item.address) setSenderAddress(item.address);
                    setIsSenderDropdownOpen(false);
                  }}
                  className="w-full text-left min-h-[44px] px-3 py-2 text-xs hover:bg-[#F8FAFC] transition-colors"
                >
                  <div className="font-bold text-[#0F172A]">{item.name}</div>
                  {item.address && <div className="text-[11px] text-[#475569] truncate">{item.address}</div>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── ROW 3: Jenis Paket & Jenis Transaksi ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Jenis Paket */}
          <div>
            <label htmlFor="entry-service-type" className="block text-xs font-semibold text-[#334155] mb-1">
              Jenis Paket (Service Type)
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="entry-service-type"
                value={serviceType}
                onChange={(e) => setServiceType(e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs bg-[#F9FAFB] border border-[#D5D9E0] rounded-[2px] text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors"
              >
                <option value="REGULER">REGULER</option>
                <option value="REGULER (DFOD)">REGULER (DFOD)</option>
              </select>
            </div>
          </div>

          {/* Jenis Transaksi */}
          <div>
            <label htmlFor="entry-payment-type" className="block text-xs font-semibold text-[#334155] mb-1">
              Jenis Transaksi (Payment Channel)
            </label>
            <div className="relative">
              <CreditCard className="w-4 h-4 text-[#475569] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                id="entry-payment-type"
                value={paymentType}
                onChange={(e) => setPaymentType(e.target.value)}
                className="w-full min-h-[44px] pl-9 pr-3 py-2 text-xs bg-[#F9FAFB] border border-[#D5D9E0] rounded-[2px] text-[#0F172A] focus:bg-white focus:border-[#0F172A] focus:outline-none transition-colors"
              >
                <option value="CASH">CASH</option>
                <option value="BCA">BCA</option>
                <option value="BRI">BRI</option>
                <option value="MANDIRI">MANDIRI</option>
              </select>
            </div>
          </div>
        </div>

        {/* ── ROW 4: Berat & Calculator Ongkir ── */}
        <div className="bg-[#F8FAFC] border border-[#E2E8F0] p-3.5 rounded-[2px] space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <div>
              <label htmlFor="entry-weight" className="block text-xs font-semibold text-[#334155] mb-1">
                Berat Paket (kg) <span className="text-red-500">*</span>
              </label>
              <input
                id="entry-weight"
                type="number"
                step="0.1"
                min="0.1"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                required
                className="w-full min-h-[44px] px-3 py-2 text-xs font-mono bg-white border border-[#D5D9E0] rounded-[2px] text-[#0F172A] focus:border-[#0F172A] focus:outline-none transition-colors"
              />
              <span className="text-[11px] text-[#475569] mt-1 block">
                Tarif {courier}: Rp{formatRupiah(rates[courier])}/kg (Dibulatkan ke atas)
              </span>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="entry-manual-amount" className="text-xs font-semibold text-[#334155]">Nominal Biaya (Rp)</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsManualAmount(!isManualAmount);
                    if (!isManualAmount) setManualAmountStr(String(autoOngkir));
                  }}
                  className="btn-hover-lift text-xs text-[#2563EB] hover:underline"
                >
                  {isManualAmount ? 'Gunakan Otomatis' : 'Override Manual'}
                </button>
              </div>

              {isManualAmount ? (
                <input
                  id="entry-manual-amount"
                  type="number"
                  value={manualAmountStr}
                  onChange={(e) => setManualAmountStr(e.target.value)}
                  placeholder="Isi biaya manual..."
                  className="w-full min-h-[44px] px-3 py-2 text-xs font-mono font-bold bg-white border border-[#2563EB] rounded-[2px] text-[#0F172A] focus:outline-none"
                />
              ) : (
                <div className="w-full min-h-[44px] px-3 py-2 text-xs font-mono font-bold bg-[#E2E8F0] border border-[#CBD5E1] rounded-[2px] text-[#0F172A] flex justify-between items-center">
                  <span>{formatRupiah(effectiveAmount)}</span>
                  <span className="text-[10px] text-[#475569] font-normal">Otomatis</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── COLLAPSIBLE SECTION: DATA LABEL (UNTUK CETAK RESI) ── */}
        <div className="border border-[#CBD5E1] rounded-[2px] overflow-hidden bg-white">
          <button
            type="button"
            onClick={() => setIsLabelSectionOpen(!isLabelSectionOpen)}
            className="w-full min-h-[44px] bg-[#F1F5F9] hover:bg-[#E2E8F0] px-3.5 py-2.5 flex items-center justify-between text-left transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#0F172A]">
                DATA LABEL (untuk cetak resi)
              </span>
              <span className="text-[10px] bg-[#E2E8F0] text-[#334155] px-1.5 py-0.5 rounded-[2px] border border-[#CBD5E1]">
                Cetak Thermal Label 100x150mm
              </span>
            </div>
            {isLabelSectionOpen ? (
              <ChevronUp className="w-4 h-4 text-[#475569]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[#475569]" />
            )}
          </button>

          {isLabelSectionOpen && (
            <div className="p-3.5 space-y-3 bg-[#FAFAFA] border-t border-[#CBD5E1]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Receiver Name */}
                <div>
                  <label htmlFor="entry-receiver-name" className="block text-xs font-semibold text-[#334155] mb-1">
                    Nama Penerima
                  </label>
                  <input
                    id="entry-receiver-name"
                    type="text"
                    value={receiverName}
                    onChange={(e) => setReceiverName(e.target.value)}
                    placeholder="Nama penerima paket (opsional)"
                    className="w-full min-h-[44px] px-3 py-2 text-xs bg-white border border-[#D5D9E0] rounded-[2px] text-[#0F172A] focus:border-[#0F172A] focus:outline-none transition-colors"
                  />
                </div>

                {/* Receiver Address */}
                <div>
                  <label htmlFor="entry-receiver-address" className="block text-xs font-semibold text-[#334155] mb-1">
                    Alamat Penerima
                  </label>
                  <input
                    id="entry-receiver-address"
                    type="text"
                    value={receiverAddress}
                    onChange={(e) => setReceiverAddress(e.target.value)}
                    placeholder="Kota / Alamat tujuan"
                    className="w-full min-h-[44px] px-3 py-2 text-xs bg-white border border-[#D5D9E0] rounded-[2px] text-[#0F172A] focus:border-[#0F172A] focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Sender Address */}
              <div>
                <label htmlFor="entry-sender-address" className="block text-xs font-semibold text-[#334155] mb-1">
                  Alamat Pengirim Detail
                </label>
                <input
                  id="entry-sender-address"
                  type="text"
                  value={senderAddress}
                  onChange={(e) => setSenderAddress(e.target.value)}
                  placeholder="Alamat asal pengiriman..."
                  className="w-full min-h-[44px] px-3 py-2 text-xs bg-white border border-[#D5D9E0] rounded-[2px] text-[#0F172A] focus:border-[#0F172A] focus:outline-none transition-colors"
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
          {editingEntry && (
            <button
              type="button"
              onClick={onCancelEdit}
              className="btn-hover-lift min-h-[44px] px-4 py-2 text-xs font-medium text-[#334155] bg-[#F1F5F9] hover:bg-[#E2E8F0] border border-[#CBD5E1] rounded-[2px] transition-all duration-[120ms]"
            >
              Batal
            </button>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="btn-hover-lift min-h-[44px] px-5 py-2 text-xs font-bold text-white bg-[#0F172A] hover:bg-[#1E293B] disabled:bg-[#94A3B8] border border-[#0F172A] rounded-[2px] shadow-sm transition-all duration-[120ms] inline-flex items-center gap-2 cursor-pointer"
          >
            {editingEntry ? <Edit3 className="w-4 h-4" /> : <Check className="w-4 h-4" />}
            {editingEntry ? 'Simpan Perubahan' : 'Catat Manifest Baru'}
          </button>
        </div>
      </form>

      {/* Quick Action bar for last logged entry */}
      {lastLoggedEntry && !editingEntry && (
        <div className="bg-[#F0FDF4] border-t border-[#BBF7D0] px-4 py-2.5 flex items-center justify-between text-xs text-[#166534]">
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-[#16A34A]" />
            <span>
              Berhasil dicatat: <strong className="font-mono font-bold">{lastLoggedEntry.resiNumber}</strong> (
              {lastLoggedEntry.senderName})
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSendWhatsApp(lastLoggedEntry)}
              className="btn-hover-lift inline-flex items-center gap-1 text-[11px] font-medium min-h-[36px] px-2.5 py-1 bg-white border border-[#BBF7D0] hover:bg-[#DCFCE7] text-[#15803D] rounded-[2px] transition-all"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Kirim WA
            </button>
            <button
              type="button"
              onClick={() => onPrintLabel(lastLoggedEntry)}
              className="btn-hover-lift inline-flex items-center gap-1 text-[11px] font-bold min-h-[36px] px-2.5 py-1 bg-[#166534] text-white hover:bg-[#14532D] rounded-[2px] transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Thermal Label
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
