import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Package,
  Scale,
  ReceiptText,
  TrendingUp,
  Truck,
  Download,
  Upload,
  Activity,
  Calendar,
  PieChart,
  MapPin,
  UserCheck,
  Copy,
  Check,
  Sparkles,
  Layers,
} from 'lucide-react';
import { ShipmentEntry, CourierRateConfig } from '../types';
import { formatRupiah, formatWeight, formatNumber, getTodayISODate, normalizeToISODate } from '../lib/formatters';

interface DashboardSummaryProps {
  shipments: ShipmentEntry[];
  rates: CourierRateConfig;
  onOpenRateSettings?: () => void;
  onExportBackup?: () => void;
  onOpenRestore?: () => void;
}

type SubTabType = 'overview' | 'monthly' | 'breakdown' | 'digest';

// ── 1. ANIMATED COUNT-UP NUMBER HELPER ──
interface CountUpNumberProps {
  value: number;
  formatter?: (val: number) => string;
  className?: string;
}

const CountUpNumber: React.FC<CountUpNumberProps> = ({ value, formatter, className = '' }) => {
  const [displayValue, setDisplayValue] = useState<number>(value);
  const prevValueRef = useRef<number>(value);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    prevValueRef.current = value;

    if (startValue === endValue) {
      setDisplayValue(endValue);
      return;
    }

    let startTimestamp: number | null = null;
    const duration = 400; // ms
    let animId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      const current = startValue + (endValue - startValue) * easeProgress;
      setDisplayValue(current);

      if (progress < 1) {
        animId = requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
      }
    };

    animId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animId);
  }, [value]);

  const formattedOutput = useMemo(() => {
    if (formatter) {
      return formatter(displayValue);
    }
    return formatNumber(Math.round(displayValue));
  }, [displayValue, formatter]);

  return <span className={className}>{formattedOutput}</span>;
};

// ── 2. MAIN DASHBOARD SUMMARY COMPONENT ──
export const DashboardSummary: React.FC<DashboardSummaryProps> = ({
  shipments,
  rates,
  onOpenRateSettings,
  onExportBackup,
  onOpenRestore,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<SubTabType>('overview');
  const [copiedDigest, setCopiedDigest] = useState<boolean>(false);
  const [hoveredSparklineIdx, setHoveredSparklineIdx] = useState<number | null>(null);

  // ── CORE METRICS CALCULATIONS ──
  const totalShipments = shipments.length;
  const totalAmount = shipments.reduce((acc, curr) => acc + curr.amount, 0);
  const totalWeight = shipments.reduce((acc, curr) => acc + curr.weight, 0);

  const avgCostPerKg = totalWeight > 0 ? Math.round(totalAmount / totalWeight) : 0;
  const avgCostPerPkg = totalShipments > 0 ? Math.round(totalAmount / totalShipments) : 0;
  const avgWeightPerPkg = totalShipments > 0 ? totalWeight / totalShipments : 0;

  // Courier Breakdown
  const jtShipments = shipments.filter(
    (s) => s.serviceType.includes('J&T') || s.resiNumber.startsWith('JT')
  );
  const jneShipments = shipments.filter(
    (s) => s.serviceType.includes('JNE') || s.resiNumber.startsWith('JNE')
  );

  const jtCount = jtShipments.length;
  const jtAmount = jtShipments.reduce((acc, curr) => acc + curr.amount, 0);
  const jtWeight = jtShipments.reduce((acc, curr) => acc + curr.weight, 0);

  const jneCount = jneShipments.length;
  const jneAmount = jneShipments.reduce((acc, curr) => acc + curr.amount, 0);
  const jneWeight = jneShipments.reduce((acc, curr) => acc + curr.weight, 0);

  const jtPercent = totalShipments > 0 ? Math.round((jtCount / totalShipments) * 100) : 0;
  const jnePercent = totalShipments > 0 ? Math.round((jneCount / totalShipments) * 100) : 0;

  // ── DELTA VS KEMARIN CALCULATIONS ──
  const todayIso = useMemo(() => getTodayISODate(), []);
  const yesterdayIso = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  }, []);

  const todayShipments = useMemo(() => {
    return shipments.filter((s) => normalizeToISODate(s.date, s.createdAt) === todayIso);
  }, [shipments, todayIso]);

  const yesterdayShipments = useMemo(() => {
    return shipments.filter((s) => normalizeToISODate(s.date, s.createdAt) === yesterdayIso);
  }, [shipments, yesterdayIso]);

  const deltaShipmentsText = useMemo(() => {
    if (yesterdayShipments.length === 0) return '—';
    const diff = todayShipments.length - yesterdayShipments.length;
    const pct = Math.round((diff / yesterdayShipments.length) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  }, [todayShipments.length, yesterdayShipments.length]);

  const deltaAmountText = useMemo(() => {
    const yesterdayAmount = yesterdayShipments.reduce((sum, s) => sum + s.amount, 0);
    if (yesterdayAmount === 0) return '—';
    const todayAmount = todayShipments.reduce((sum, s) => sum + s.amount, 0);
    const diff = todayAmount - yesterdayAmount;
    const pct = Math.round((diff / yesterdayAmount) * 100);
    return pct >= 0 ? `+${pct}%` : `${pct}%`;
  }, [todayShipments, yesterdayShipments]);

  // ── 1. MONTHLY REKAP (MONTHLY FINANCIAL & VOLUME SUMMARY) ──
  const monthlySummary = useMemo(() => {
    const map = new Map<
      string,
      {
        monthKey: string;
        monthLabel: string;
        totalCount: number;
        totalWeight: number;
        totalAmount: number;
        jtCount: number;
        jtAmount: number;
        jneCount: number;
        jneAmount: number;
        regulerCount: number;
        regulerAmount: number;
        dfodCount: number;
        dfodAmount: number;
      }
    >();

    for (const s of shipments) {
      const isoDate = normalizeToISODate(s.date, s.createdAt);
      const monthKey = isoDate.substring(0, 7); // e.g. "2026-09"
      if (!monthKey || monthKey.length < 7) continue;

      const [yearStr, monthStr] = monthKey.split('-');
      const year = parseInt(yearStr, 10);
      const monthIdx = parseInt(monthStr, 10) - 1;

      const dateObj = new Date(year, monthIdx, 1);
      const monthLabel = isNaN(dateObj.getTime())
        ? monthKey
        : dateObj.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

      if (!map.has(monthKey)) {
        map.set(monthKey, {
          monthKey,
          monthLabel,
          totalCount: 0,
          totalWeight: 0,
          totalAmount: 0,
          jtCount: 0,
          jtAmount: 0,
          jneCount: 0,
          jneAmount: 0,
          regulerCount: 0,
          regulerAmount: 0,
          dfodCount: 0,
          dfodAmount: 0,
        });
      }

      const item = map.get(monthKey)!;
      item.totalCount += 1;
      item.totalWeight += s.weight || 0;
      item.totalAmount += s.amount || 0;

      const isJt = s.serviceType.includes('J&T') || s.resiNumber.startsWith('JT');
      if (isJt) {
        item.jtCount += 1;
        item.jtAmount += s.amount || 0;
      } else {
        item.jneCount += 1;
        item.jneAmount += s.amount || 0;
      }

      const isDfod = s.paymentType === 'DFOD' || s.serviceType.toUpperCase().includes('DFOD');
      if (isDfod) {
        item.dfodCount += 1;
        item.dfodAmount += s.amount || 0;
      } else {
        item.regulerCount += 1;
        item.regulerAmount += s.amount || 0;
      }
    }

    return Array.from(map.values()).sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [shipments]);

  // ── 2. DISBURSEMENT BREAKDOWN (REGULER VS DFOD) ──
  const disbursementBreakdown = useMemo(() => {
    let regulerCount = 0;
    let regulerAmount = 0;
    let regulerWeight = 0;

    let dfodCount = 0;
    let dfodAmount = 0;
    let dfodWeight = 0;

    for (const s of shipments) {
      const isDfod = s.paymentType === 'DFOD' || s.serviceType.toUpperCase().includes('DFOD');
      if (isDfod) {
        dfodCount += 1;
        dfodAmount += s.amount || 0;
        dfodWeight += s.weight || 0;
      } else {
        regulerCount += 1;
        regulerAmount += s.amount || 0;
        regulerWeight += s.weight || 0;
      }
    }

    const totalCountVal = shipments.length || 1;
    const totalAmountVal = totalAmount || 1;

    return {
      reguler: {
        count: regulerCount,
        amount: regulerAmount,
        weight: regulerWeight,
        countPct: Math.round((regulerCount / totalCountVal) * 100),
        amountPct: Math.round((regulerAmount / totalAmountVal) * 100),
        avgCost: regulerCount > 0 ? Math.round(regulerAmount / regulerCount) : 0,
      },
      dfod: {
        count: dfodCount,
        amount: dfodAmount,
        weight: dfodWeight,
        countPct: Math.round((dfodCount / totalCountVal) * 100),
        amountPct: Math.round((dfodAmount / totalAmountVal) * 100),
        avgCost: dfodCount > 0 ? Math.round(dfodAmount / dfodCount) : 0,
      },
    };
  }, [shipments, totalAmount]);

  // ── 3. TOP SENDERS & TOP DESTINATIONS ──
  const topSenders = useMemo(() => {
    const map = new Map<string, { name: string; count: number; weight: number; amount: number }>();

    for (const s of shipments) {
      const name = (s.senderName || 'Tanpa Nama').trim();
      if (!map.has(name)) {
        map.set(name, { name, count: 0, weight: 0, amount: 0 });
      }
      const item = map.get(name)!;
      item.count += 1;
      item.weight += s.weight || 0;
      item.amount += s.amount || 0;
    }

    const list = Array.from(map.values()).sort((a, b) => b.count - a.count || b.amount - a.amount);
    const totalCountVal = shipments.length || 1;

    return list.slice(0, 5).map((item) => ({
      ...item,
      percent: Math.round((item.count / totalCountVal) * 100),
    }));
  }, [shipments]);

  const topDestinations = useMemo(() => {
    const extractCity = (addr: string, receiverName: string): string => {
      const raw = (addr || receiverName || 'Luar Kota').trim();
      if (!raw) return 'Luar Kota';
      const parts = raw.split(',').map((p) => p.trim());
      if (parts.length > 1) {
        return parts[parts.length - 1] || parts[0];
      }
      return raw;
    };

    const map = new Map<string, { city: string; count: number; weight: number; amount: number }>();

    for (const s of shipments) {
      const city = extractCity(s.receiverAddress, s.receiverName);
      if (!map.has(city)) {
        map.set(city, { city, count: 0, weight: 0, amount: 0 });
      }
      const item = map.get(city)!;
      item.count += 1;
      item.weight += s.weight || 0;
      item.amount += s.amount || 0;
    }

    const list = Array.from(map.values()).sort((a, b) => b.count - a.count || b.amount - a.amount);
    const totalCountVal = shipments.length || 1;

    return list.slice(0, 5).map((item) => ({
      ...item,
      percent: Math.round((item.count / totalCountVal) * 100),
    }));
  }, [shipments]);

  // ── 4. 14-DAY SPARKLINE WITH HOVER DETAILS ──
  const sparklineDetails = useMemo(() => {
    const points: Array<{
      dateLabel: string;
      isoDate: string;
      count: number;
      amount: number;
      weight: number;
      x: number;
      y: number;
    }> = [];

    const now = new Date();
    const width = 280;
    const height = 40;
    const padding = 6;
    const step = width / 13;

    // Collect daily counts
    const rawCounts: number[] = [];
    const dayDataList: Array<{ isoDate: string; dateLabel: string; count: number; amount: number; weight: number }> = [];

    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().split('T')[0];
      const dateLabel = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });

      const dayShipments = shipments.filter(
        (s) => normalizeToISODate(s.date, s.createdAt) === iso
      );

      const count = dayShipments.length;
      const amount = dayShipments.reduce((acc, curr) => acc + curr.amount, 0);
      const weight = dayShipments.reduce((acc, curr) => acc + curr.weight, 0);

      rawCounts.push(count);
      dayDataList.push({ isoDate: iso, dateLabel, count, amount, weight });
    }

    const maxVal = Math.max(...rawCounts, 1);

    dayDataList.forEach((item, idx) => {
      const x = idx * step;
      const y = height - (item.count / maxVal) * (height - padding * 2) - padding;
      points.push({ ...item, x, y });
    });

    return { points, maxVal, rawCounts };
  }, [shipments]);

  const showSparkline = useMemo(() => {
    const nonZeroPoints = sparklineDetails.rawCounts.filter((c) => c > 0).length;
    return shipments.length >= 2 && nonZeroPoints >= 2;
  }, [shipments.length, sparklineDetails.rawCounts]);

  const sparklinePointsString = useMemo(() => {
    return sparklineDetails.points.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }, [sparklineDetails.points]);

  // ── 5. QUICK REPORT DIGEST FOR WA / MEMO ──
  const quickDigestText = useMemo(() => {
    const todayStr = new Date().toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    const topSenderStr =
      topSenders.length > 0
        ? topSenders
            .slice(0, 3)
            .map((s, idx) => `${idx + 1}. ${s.name} (${s.count} paket - ${formatRupiah(s.amount)})`)
            .join('\n')
        : '- Belum ada data pengirim';

    const topDestStr =
      topDestinations.length > 0
        ? topDestinations
            .slice(0, 3)
            .map((d, idx) => `${idx + 1}. ${d.city} (${d.count} paket)`)
            .join('\n')
        : '- Belum ada data tujuan';

    return `📊 *LAPORAN ANALYTICS OPERASIONAL JANKA*
Tanggal Cetak: ${todayStr}

📦 *RINGKASAN METRIK MANIFEST*
• Total Manifest: ${formatNumber(totalShipments)} paket
• Total Akumulasi Berat: ${formatWeight(totalWeight)}
• Total Kas Keluar: ${formatRupiah(totalAmount)}
• Rata-rata Berat: ${avgWeightPerPkg.toFixed(2)} kg/paket
• Rata-rata Biaya: ${formatRupiah(avgCostPerPkg)}/paket (${formatRupiah(avgCostPerKg)}/kg)

🚛 *BREAKDOWN KURIR*
• J&T Express: ${jtCount} paket (${jtPercent}%) | ${formatRupiah(jtAmount)}
• JNE Express: ${jneCount} paket (${jnePercent}%) | ${formatRupiah(jneAmount)}

💳 *ALOKASI BEBAN KAS*
• Kas Reguler (Tunai): ${disbursementBreakdown.reguler.count} paket | ${formatRupiah(
      disbursementBreakdown.reguler.amount
    )} (${disbursementBreakdown.reguler.amountPct}%)
• DFOD / Non-Reguler: ${disbursementBreakdown.dfod.count} paket | ${formatRupiah(
      disbursementBreakdown.dfod.amount
    )} (${disbursementBreakdown.dfod.amountPct}%)

🏆 *TOP PENGIRIM TERBANYAK*
${topSenderStr}

📍 *TOP DESTINASI PENGIRIMAN*
${topDestStr}

---
_Laporan disiapkan secara otomatis oleh Janka Logistics Ledger System_`;
  }, [
    totalShipments,
    totalWeight,
    totalAmount,
    avgWeightPerPkg,
    avgCostPerPkg,
    avgCostPerKg,
    jtCount,
    jtPercent,
    jtAmount,
    jneCount,
    jnePercent,
    jneAmount,
    disbursementBreakdown,
    topSenders,
    topDestinations,
  ]);

  const handleCopyDigest = async () => {
    try {
      await navigator.clipboard.writeText(quickDigestText);
      setCopiedDigest(true);
      setTimeout(() => setCopiedDigest(false), 3000);
    } catch (err) {
      console.error('Failed to copy text', err);
    }
  };

  return (
    <div className="w-full space-y-4 2xl:space-y-6">
      {/* ── 1. HEADER TOOLBAR: TITLE, ACTION BUTTONS & SUB-TABS ── */}
      <div className="bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs space-y-3 2xl:space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2.5">
            <ReceiptText className="w-5 h-5 2xl:w-6 2xl:h-6 text-[#0F172A]" />
            <div>
              <h2 className="text-base 2xl:text-xl font-bold text-[#0F172A] uppercase tracking-wider font-mono">
                Laporan Analytics Operasional Kas &amp; Manifest
              </h2>
              <p className="text-xs 2xl:text-sm text-[#475569] mt-0.5">
                Ringkasan Real-time, Buku Rekap Kas Bulanan, dan Distribusi Pengiriman
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onExportBackup && (
              <button
                type="button"
                onClick={onExportBackup}
                className="btn-hover-lift flex items-center gap-1.5 min-h-[34px] 2xl:min-h-[38px] px-3 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] font-mono text-xs 2xl:text-sm font-bold rounded-[2px] cursor-pointer shadow-2xs"
                title="Unduh cadangan data JSON"
              >
                <Download className="h-4 w-4 text-[#475569]" />
                <span>Backup JSON</span>
              </button>
            )}

            {onOpenRestore && (
              <button
                type="button"
                onClick={onOpenRestore}
                className="btn-hover-lift flex items-center gap-1.5 min-h-[34px] 2xl:min-h-[38px] px-3 py-1.5 bg-white hover:bg-[#F8FAFC] border border-[#CBD5E1] text-[#334155] font-mono text-xs 2xl:text-sm font-bold rounded-[2px] cursor-pointer shadow-2xs"
                title="Muat file cadangan data JSON"
              >
                <Upload className="h-4 w-4 text-[#475569]" />
                <span>Restore JSON</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Tab Navigation Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            className={`btn-hover-lift pill-indicator min-h-[38px] 2xl:min-h-[42px] px-3.5 2xl:px-4 py-2 text-xs 2xl:text-sm font-semibold font-mono rounded-[2px] flex items-center gap-2 border transition-all whitespace-nowrap ${
              activeSubTab === 'overview'
                ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-2xs tab-active-pill'
                : 'bg-[#F8FAFC] text-[#334155] hover:bg-[#F1F5F9] border-[#CBD5E1]'
            }`}
          >
            <Activity className="w-4 h-4 2xl:w-4.5 2xl:h-4.5" />
            <span>Ringkasan Metrik</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('monthly')}
            className={`btn-hover-lift pill-indicator min-h-[38px] 2xl:min-h-[42px] px-3.5 2xl:px-4 py-2 text-xs 2xl:text-sm font-semibold font-mono rounded-[2px] flex items-center gap-2 border transition-all whitespace-nowrap ${
              activeSubTab === 'monthly'
                ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-2xs tab-active-pill'
                : 'bg-[#F8FAFC] text-[#334155] hover:bg-[#F1F5F9] border-[#CBD5E1]'
            }`}
          >
            <Calendar className="w-4 h-4 2xl:w-4.5 2xl:h-4.5" />
            <span>Rekap Kas Bulanan ({monthlySummary.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('breakdown')}
            className={`btn-hover-lift pill-indicator min-h-[38px] 2xl:min-h-[42px] px-3.5 2xl:px-4 py-2 text-xs 2xl:text-sm font-semibold font-mono rounded-[2px] flex items-center gap-2 border transition-all whitespace-nowrap ${
              activeSubTab === 'breakdown'
                ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-2xs tab-active-pill'
                : 'bg-[#F8FAFC] text-[#334155] hover:bg-[#F1F5F9] border-[#CBD5E1]'
            }`}
          >
            <PieChart className="w-4 h-4 2xl:w-4.5 2xl:h-4.5" />
            <span>Alokasi Beban &amp; Top Pengirim</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('digest')}
            className={`btn-hover-lift pill-indicator min-h-[38px] 2xl:min-h-[42px] px-3.5 2xl:px-4 py-2 text-xs 2xl:text-sm font-semibold font-mono rounded-[2px] flex items-center gap-2 border transition-all whitespace-nowrap ${
              activeSubTab === 'digest'
                ? 'bg-[#0F172A] text-white border-[#0F172A] shadow-2xs tab-active-pill'
                : 'bg-[#F8FAFC] text-[#334155] hover:bg-[#F1F5F9] border-[#CBD5E1]'
            }`}
          >
            <Sparkles className="w-4 h-4 2xl:w-4.5 2xl:h-4.5 text-[#F59E0B]" />
            <span>Quick Digest (WA / Memo)</span>
          </button>
        </div>
      </div>

      {/* ── 2. SUB-TAB VIEW 1: RINGKASAN METRIK & TREN ── */}
      {activeSubTab === 'overview' && (
        <div key="overview" className="space-y-4 2xl:space-y-6 animate-view-slide">
          {/* Top 4 Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 2xl:gap-5">
            {/* Card 1: Total Manifest */}
            <div className="card-elevate bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#475569] mb-1">
                  <span className="text-xs 2xl:text-sm font-bold uppercase tracking-wider font-mono">
                    Total Manifest
                  </span>
                  <Package className="h-4 w-4 2xl:h-5 2xl:w-5 text-[#334155]" />
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="font-mono text-2xl 2xl:text-3xl font-bold text-[#0F172A] tabular-nums">
                    <CountUpNumber value={totalShipments} />
                  </span>
                  <span className="text-xs 2xl:text-sm text-[#475569] font-medium">paket</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs 2xl:text-sm">
                <span className="text-[#475569]">vs kemarin:</span>
                <span
                  className={`font-mono font-bold ${
                    deltaShipmentsText.startsWith('+')
                      ? 'text-[#16A34A]'
                      : deltaShipmentsText === '—'
                      ? 'text-[#475569]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {deltaShipmentsText}
                </span>
              </div>
            </div>

            {/* Card 2: Total Kas Keluar */}
            <div className="card-elevate bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#475569] mb-1">
                  <span className="text-xs 2xl:text-sm font-bold uppercase tracking-wider font-mono">
                    Total Kas Keluar
                  </span>
                  <ReceiptText className="h-4 w-4 2xl:h-5 2xl:w-5 text-[#334155]" />
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="font-mono text-2xl 2xl:text-3xl font-bold text-[#0F172A] tabular-nums">
                    <CountUpNumber value={totalAmount} formatter={formatRupiah} />
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs 2xl:text-sm">
                <span className="text-[#475569]">vs kemarin:</span>
                <span
                  className={`font-mono font-bold ${
                    deltaAmountText.startsWith('+')
                      ? 'text-[#16A34A]'
                      : deltaAmountText === '—'
                      ? 'text-[#475569]'
                      : 'text-[#DC2626]'
                  }`}
                >
                  {deltaAmountText}
                </span>
              </div>
            </div>

            {/* Card 3: Akumulasi Berat & Efisiensi */}
            <div className="card-elevate bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#475569] mb-1">
                  <span className="text-xs 2xl:text-sm font-bold uppercase tracking-wider font-mono">
                    Akumulasi Berat
                  </span>
                  <Scale className="h-4 w-4 2xl:h-5 2xl:w-5 text-[#334155]" />
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="font-mono text-2xl 2xl:text-3xl font-bold text-[#0F172A] tabular-nums">
                    <CountUpNumber value={totalWeight} formatter={formatWeight} />
                  </span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs 2xl:text-sm">
                <span className="text-[#475569]">Rata-rata:</span>
                <span className="font-mono font-bold text-[#0F172A]">
                  {avgWeightPerPkg.toFixed(2)} kg/pkg
                </span>
              </div>
            </div>

            {/* Card 4: Rata-Rata Biaya per Kg */}
            <div className="card-elevate bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs transition-all flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-[#475569] mb-1">
                  <span className="text-xs 2xl:text-sm font-bold uppercase tracking-wider font-mono">
                    Biaya per Kg
                  </span>
                  <TrendingUp className="h-4 w-4 2xl:h-5 2xl:w-5 text-[#334155]" />
                </div>
                <div className="flex items-baseline space-x-1.5">
                  <span className="font-mono text-2xl 2xl:text-3xl font-bold text-[#0F172A] tabular-nums">
                    <CountUpNumber value={avgCostPerKg} formatter={formatRupiah} />
                  </span>
                  <span className="text-xs 2xl:text-sm text-[#475569] font-medium">/kg</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[#F1F5F9] flex items-center justify-between text-xs 2xl:text-sm">
                <span className="text-[#475569]">Efisiensi kas</span>
                <span className="font-mono font-semibold text-[#16A34A]">Optimum</span>
              </div>
            </div>
          </div>

          {/* 14-Day Volume Sparkline Section with Interactive Hover Points */}
          {showSparkline && (
            <div className="card-elevate bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#334155]">
                  <Activity className="w-4 h-4 2xl:w-5 2xl:h-5 text-[#0F172A]" />
                  <span className="text-xs 2xl:text-sm font-bold uppercase tracking-wider text-[#0F172A] font-mono">
                    Tren Volume Manifest (14 Hari Terakhir)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs 2xl:text-sm font-mono text-[#475569]">
                    Puncak: <strong>{sparklineDetails.maxVal} paket/hari</strong>
                  </span>
                </div>
              </div>

              {/* SVG Sparkline Container with Tooltip */}
              <div className="relative w-full bg-[#F8FAFC] border border-[#E2E8F0] rounded-[2px] p-2.5 2xl:p-3">
                <div className="w-full h-8 2xl:h-10 flex items-center justify-center relative">
                  <svg
                    className="w-full h-full overflow-visible"
                    viewBox="0 0 280 40"
                    preserveAspectRatio="none"
                  >
                    {/* Polyline line */}
                    <polyline
                      fill="none"
                      stroke="#0F172A"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      points={sparklinePointsString}
                    />

                    {/* Interactive dots */}
                    {sparklineDetails.points.map((pt, idx) => (
                      <g key={pt.isoDate}>
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={hoveredSparklineIdx === idx ? '4' : '2.5'}
                          className={`transition-all duration-150 cursor-pointer ${
                            hoveredSparklineIdx === idx
                              ? 'fill-[#2563EB] stroke-white stroke-2'
                              : 'fill-[#0F172A]'
                          }`}
                          onMouseEnter={() => setHoveredSparklineIdx(idx)}
                          onMouseLeave={() => setHoveredSparklineIdx(null)}
                        />
                      </g>
                    ))}
                  </svg>

                  {/* Interactive Tooltip on Hover */}
                  {hoveredSparklineIdx !== null && sparklineDetails.points[hoveredSparklineIdx] && (
                    <div
                      className="absolute z-20 pointer-events-none bg-[#0F172A] text-white text-xs font-mono px-2.5 py-1.5 rounded-[2px] shadow-md border border-[#334155] -top-10 transition-all animate-fade-in whitespace-nowrap"
                      style={{
                        left: `${(hoveredSparklineIdx / 13) * 85 + 5}%`,
                        transform: 'translateX(-50%)',
                      }}
                    >
                      <div className="font-bold text-[#38BDF8]">
                        {sparklineDetails.points[hoveredSparklineIdx].dateLabel}:{' '}
                        {sparklineDetails.points[hoveredSparklineIdx].count} paket
                      </div>
                      <div className="text-[10px] text-[#94A3B8]">
                        {formatRupiah(sparklineDetails.points[hoveredSparklineIdx].amount)} •{' '}
                        {formatWeight(sparklineDetails.points[hoveredSparklineIdx].weight)}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs 2xl:text-sm font-mono text-[#64748B] mt-1 pt-1 border-t border-[#E2E8F0]">
                  <span>{sparklineDetails.points[0]?.dateLabel}</span>
                  <span>{sparklineDetails.points[6]?.dateLabel}</span>
                  <span>{sparklineDetails.points[13]?.dateLabel}</span>
                </div>
              </div>
            </div>
          )}

          {/* Courier Breakdown Panel + CSS-only Mini Bar Chart */}
          <div className="bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 2xl:h-5 2xl:w-5 text-[#0F172A]" />
                <h3 className="text-xs 2xl:text-sm font-bold text-[#0F172A] uppercase tracking-wider font-mono">
                  Breakdown Alokasi Kurir Ekspedisi
                </h3>
              </div>
              {onOpenRateSettings && (
                <button
                  type="button"
                  onClick={onOpenRateSettings}
                  className="btn-hover-lift text-xs 2xl:text-sm font-mono text-[#334155] hover:text-[#0F172A] underline cursor-pointer"
                >
                  Atur Tarif Default
                </button>
              )}
            </div>

            {/* Courier Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 2xl:gap-4">
              {/* J&T Breakdown */}
              <div className="border border-[#CBD5E1] bg-[#F8FAFC] rounded-[2px] p-3 2xl:p-4 flex items-center justify-between hover:border-[#94A3B8] transition-all">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-[2px] bg-[#0F172A] text-white font-mono text-xs 2xl:text-sm font-bold">
                      J&amp;T Express
                    </span>
                    <span className="text-xs 2xl:text-sm text-[#475569] font-mono">
                      (Tarif: {formatRupiah(rates.JT)}/kg)
                    </span>
                  </div>
                  <div className="text-xs 2xl:text-sm text-[#334155]">
                    <span className="font-bold">{jtCount} paket</span>
                    <span className="mx-1.5 text-[#CBD5E1]">•</span>
                    <span>{formatWeight(jtWeight)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm 2xl:text-base font-bold text-[#0F172A] tabular-nums">
                    {formatRupiah(jtAmount)}
                  </span>
                  <span className="block text-xs 2xl:text-sm text-[#475569]">
                    {totalAmount > 0 ? `${((jtAmount / totalAmount) * 100).toFixed(0)}% kas` : '0%'}
                  </span>
                </div>
              </div>

              {/* JNE Breakdown */}
              <div className="border border-[#CBD5E1] bg-[#F8FAFC] rounded-[2px] p-3 2xl:p-4 flex items-center justify-between hover:border-[#94A3B8] transition-all">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-[2px] bg-[#334155] text-white font-mono text-xs 2xl:text-sm font-bold">
                      JNE Express
                    </span>
                    <span className="text-xs 2xl:text-sm text-[#475569] font-mono">
                      (Tarif: {formatRupiah(rates.JNE)}/kg)
                    </span>
                  </div>
                  <div className="text-xs 2xl:text-sm text-[#334155]">
                    <span className="font-bold">{jneCount} paket</span>
                    <span className="mx-1.5 text-[#CBD5E1]">•</span>
                    <span>{formatWeight(jneWeight)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="font-mono text-sm 2xl:text-base font-bold text-[#0F172A] tabular-nums">
                    {formatRupiah(jneAmount)}
                  </span>
                  <span className="block text-xs 2xl:text-sm text-[#475569]">
                    {totalAmount > 0 ? `${((jneAmount / totalAmount) * 100).toFixed(0)}% kas` : '0%'}
                  </span>
                </div>
              </div>
            </div>

            {/* CSS Bar Chart for Courier Volume */}
            <div className="bg-[#F1F5F9] border border-[#CBD5E1] p-2.5 2xl:p-3 rounded-[2px] space-y-1.5">
              <div className="flex items-center justify-between text-xs 2xl:text-sm font-medium text-[#334155]">
                <span className="font-bold text-xs 2xl:text-sm uppercase tracking-wider text-[#0F172A] font-mono">
                  Proporsi Volume Kurir
                </span>
                <span className="font-mono text-xs 2xl:text-sm text-[#475569]">
                  J&amp;T: {jtPercent}% ({jtCount} pkg) | JNE: {jnePercent}% ({jneCount} pkg)
                </span>
              </div>

              <div className="w-full h-3 2xl:h-3.5 bg-[#E2E8F0] rounded-[2px] overflow-hidden flex border border-[#CBD5E1]">
                <div
                  style={{ width: `${jtPercent}%` }}
                  className="bg-[#0F172A] h-full progress-bar-fill hover:opacity-90 cursor-pointer"
                  title={`J&T Express: ${jtCount} paket (${jtPercent}%) - ${formatRupiah(jtAmount)}`}
                />
                <div
                  style={{ width: `${jnePercent}%` }}
                  className="bg-[#475569] h-full progress-bar-fill hover:opacity-90 cursor-pointer"
                  title={`JNE Express: ${jneCount} paket (${jnePercent}%) - ${formatRupiah(jneAmount)}`}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 3. SUB-TAB VIEW 2: REKAP KAS BULANAN (MONTHLY FINANCIAL SUMMARY) ── */}
      {activeSubTab === 'monthly' && (
        <div key="monthly" className="card-elevate bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs space-y-4 animate-view-slide">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5 2xl:w-6 2xl:h-6 text-[#0F172A]" />
              <div>
                <h3 className="text-xs 2xl:text-sm font-bold uppercase tracking-wider font-mono text-[#0F172A]">
                  Rekapitulasi Bulanan (Monthly Financial &amp; Volume Summary)
                </h3>
                <p className="text-xs 2xl:text-sm text-[#475569]">
                  Digunakan untuk pelaporan buku kas operasional per lembar kerja bulanan
                </p>
              </div>
            </div>
            <span className="text-xs 2xl:text-sm font-mono bg-[#F1F5F9] text-[#334155] border border-[#CBD5E1] px-2.5 py-1 rounded-[2px]">
              {monthlySummary.length} Bulan Terdaftar
            </span>
          </div>

          {monthlySummary.length === 0 ? (
            <div className="p-8 text-center text-xs 2xl:text-sm text-[#64748B] bg-[#F8FAFC] rounded-[2px] border border-dashed border-[#CBD5E1]">
              Belum ada data manifest untuk disusun ke rekap bulanan.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs 2xl:text-sm border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#D5D9E0] text-[#475569] font-mono text-xs 2xl:text-sm uppercase">
                    <th className="py-3 px-3.5">Periode Bulan</th>
                    <th className="py-3 px-3.5 text-right">Volume (Paket)</th>
                    <th className="py-3 px-3.5 text-right">Berat Total</th>
                    <th className="py-3 px-3.5 text-right">Total Kas Keluar</th>
                    <th className="py-3 px-3.5 text-right">J&amp;T (Paket / Rp)</th>
                    <th className="py-3 px-3.5 text-right">JNE (Paket / Rp)</th>
                    <th className="py-3 px-3.5 text-right">Reguler vs DFOD</th>
                    <th className="py-3 px-3.5 text-right">Rata-rata/Pkg</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {monthlySummary.map((m) => {
                    const monthAvgPkg = m.totalCount > 0 ? Math.round(m.totalAmount / m.totalCount) : 0;
                    return (
                      <tr key={m.monthKey} className="row-elevate hover:bg-[#F8FAFC] transition-colors">
                        <td className="py-3 px-3.5 font-bold text-[#0F172A] font-mono whitespace-nowrap">
                          {m.monthLabel}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-right font-semibold whitespace-nowrap">
                          {formatNumber(m.totalCount)} paket
                        </td>
                        <td className="py-3 px-3.5 font-mono text-right text-[#334155] whitespace-nowrap">
                          {formatWeight(m.totalWeight)}
                        </td>
                        <td className="py-3 px-3.5 font-mono font-bold text-right text-[#0F172A] whitespace-nowrap">
                          {formatRupiah(m.totalAmount)}
                        </td>
                        <td className="py-3 px-3.5 font-mono text-right text-[#334155] whitespace-nowrap">
                          <span>{m.jtCount} pkg</span>
                          <span className="text-[#64748B] text-xs block">
                            {formatRupiah(m.jtAmount)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-right text-[#334155] whitespace-nowrap">
                          <span>{m.jneCount} pkg</span>
                          <span className="text-[#64748B] text-xs block">
                            {formatRupiah(m.jneAmount)}
                          </span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-right text-[#334155] whitespace-nowrap">
                          <span className="text-[#16A34A] font-medium">Reg: {m.regulerCount}</span>
                          <span className="mx-1 text-[#CBD5E1]">|</span>
                          <span className="text-[#D97706] font-medium">DFOD: {m.dfodCount}</span>
                        </td>
                        <td className="py-3 px-3.5 font-mono text-right font-semibold text-[#0F172A] whitespace-nowrap">
                          {formatRupiah(monthAvgPkg)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── 4. SUB-TAB VIEW 3: ALOKASI BEBAN KAS & TOP DISTRIBUTION ── */}
      {activeSubTab === 'breakdown' && (
        <div key="breakdown" className="space-y-6 2xl:space-y-8 animate-view-slide">
          {/* Section A: Alokasi Beban Kas Reguler vs DFOD */}
          <div className="card-elevate bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
              <div className="flex items-center gap-2.5">
                <Layers className="w-5 h-5 2xl:w-6 2xl:h-6 text-[#0F172A]" />
                <div>
                  <h3 className="text-xs 2xl:text-sm font-bold uppercase tracking-wider font-mono text-[#0F172A]">
                    Estimasi &amp; Alokasi Beban Kas (Disbursement Breakdown)
                  </h3>
                  <p className="text-xs 2xl:text-sm text-[#475569]">
                    Perbandingan alokasi kas pengeluaran reguler vs pembayaran tujuan (DFOD)
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 2xl:gap-5">
              {/* Reguler Kas */}
              <div className="border border-[#CBD5E1] bg-[#F8FAFC] p-4 2xl:p-5 rounded-[2px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs 2xl:text-sm font-bold text-[#0F172A] font-mono flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#16A34A]" />
                    Kas Reguler (Tunai / Direct)
                  </span>
                  <span className="text-xs 2xl:text-sm font-mono font-bold bg-[#E2E8F0] px-2 py-0.5 rounded-[2px]">
                    {disbursementBreakdown.reguler.amountPct}% Kas
                  </span>
                </div>
                <div className="text-xl 2xl:text-2xl font-mono font-bold text-[#0F172A]">
                  {formatRupiah(disbursementBreakdown.reguler.amount)}
                </div>
                <div className="text-xs 2xl:text-sm text-[#475569] flex justify-between font-mono">
                  <span>{disbursementBreakdown.reguler.count} manifest paket</span>
                  <span>Rata-rata: {formatRupiah(disbursementBreakdown.reguler.avgCost)}/pkg</span>
                </div>
              </div>

              {/* DFOD / Non-Reguler */}
              <div className="border border-[#CBD5E1] bg-[#F8FAFC] p-4 2xl:p-5 rounded-[2px] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs 2xl:text-sm font-bold text-[#0F172A] font-mono flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D97706]" />
                    DFOD / Non-Reguler (Ongkir Tujuan)
                  </span>
                  <span className="text-xs 2xl:text-sm font-mono font-bold bg-[#E2E8F0] px-2 py-0.5 rounded-[2px]">
                    {disbursementBreakdown.dfod.amountPct}% Kas
                  </span>
                </div>
                <div className="text-xl 2xl:text-2xl font-mono font-bold text-[#0F172A]">
                  {formatRupiah(disbursementBreakdown.dfod.amount)}
                </div>
                <div className="text-xs 2xl:text-sm text-[#475569] flex justify-between font-mono">
                  <span>{disbursementBreakdown.dfod.count} manifest paket</span>
                  <span>Rata-rata: {formatRupiah(disbursementBreakdown.dfod.avgCost)}/pkg</span>
                </div>
              </div>
            </div>

            {/* Combined Progress Bar */}
            <div className="bg-[#F1F5F9] border border-[#CBD5E1] p-3 rounded-[2px] space-y-2">
              <div className="flex items-center justify-between text-xs 2xl:text-sm font-mono text-[#475569]">
                <span>Alokasi Kas: Reguler ({disbursementBreakdown.reguler.amountPct}%)</span>
                <span>DFOD ({disbursementBreakdown.dfod.amountPct}%)</span>
              </div>
              <div className="w-full h-3.5 bg-[#E2E8F0] rounded-[2px] overflow-hidden flex border border-[#CBD5E1]">
                <div
                  style={{ width: `${disbursementBreakdown.reguler.amountPct}%` }}
                  className="bg-[#16A34A] h-full progress-bar-fill hover:opacity-90 cursor-pointer"
                  title={`Kas Reguler: ${disbursementBreakdown.reguler.count} paket (${formatRupiah(disbursementBreakdown.reguler.amount)})`}
                />
                <div
                  style={{ width: `${disbursementBreakdown.dfod.amountPct}%` }}
                  className="bg-[#D97706] h-full progress-bar-fill hover:opacity-90 cursor-pointer"
                  title={`DFOD: ${disbursementBreakdown.dfod.count} paket (${formatRupiah(disbursementBreakdown.dfod.amount)})`}
                />
              </div>
            </div>
          </div>

          {/* Section B: Top Senders & Top Destinations Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 2xl:gap-6">
            {/* Top Senders List */}
            <div className="card-elevate bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                <h3 className="text-xs 2xl:text-sm font-bold uppercase tracking-wider font-mono text-[#0F172A] flex items-center gap-2">
                  <UserCheck className="w-4 h-4 2xl:w-5 2xl:h-5 text-[#0F172A]" />
                  Top 5 Pengirim Terbanyak
                </h3>
                <span className="text-xs 2xl:text-sm font-mono text-[#64748B]">Volume Paket</span>
              </div>

              {topSenders.length === 0 ? (
                <p className="text-xs 2xl:text-sm text-[#64748B] py-4 text-center">Belum ada data pengirim.</p>
              ) : (
                <div className="space-y-3">
                  {topSenders.map((item, idx) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs 2xl:text-sm font-mono">
                        <span className="font-semibold text-[#0F172A] truncate max-w-[200px]">
                          {idx + 1}. {item.name}
                        </span>
                        <span className="text-[#475569]">
                          <strong>{item.count} paket</strong> ({formatRupiah(item.amount)})
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F1F5F9] rounded-[2px] overflow-hidden border border-[#E2E8F0]">
                        <div
                          style={{ width: `${item.percent}%` }}
                          className="bg-[#0F172A] h-full progress-bar-fill"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Destination Cities */}
            <div className="card-elevate bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-2.5">
                <h3 className="text-xs 2xl:text-sm font-bold uppercase tracking-wider font-mono text-[#0F172A] flex items-center gap-2">
                  <MapPin className="w-4 h-4 2xl:w-5 2xl:h-5 text-[#0F172A]" />
                  Top 5 Destinasi Pengiriman
                </h3>
                <span className="text-xs 2xl:text-sm font-mono text-[#64748B]">Sebaran Kota</span>
              </div>

              {topDestinations.length === 0 ? (
                <p className="text-xs 2xl:text-sm text-[#64748B] py-4 text-center">Belum ada data destinasi.</p>
              ) : (
                <div className="space-y-3">
                  {topDestinations.map((item, idx) => (
                    <div key={item.city} className="space-y-1">
                      <div className="flex items-center justify-between text-xs 2xl:text-sm font-mono">
                        <span className="font-semibold text-[#0F172A] truncate max-w-[200px]">
                          {idx + 1}. {item.city}
                        </span>
                        <span className="text-[#475569]">
                          <strong>{item.count} paket</strong> ({formatWeight(item.weight)})
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-[#F1F5F9] rounded-[2px] overflow-hidden border border-[#E2E8F0]">
                        <div
                          style={{ width: `${item.percent}%` }}
                          className="bg-[#475569] h-full progress-bar-fill"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 5. SUB-TAB VIEW 4: QUICK REPORT DIGEST FOR WA / MEMO ── */}
      {activeSubTab === 'digest' && (
        <div key="digest" className="card-elevate bg-white border border-[#D5D9E0] rounded-[3px] p-4 2xl:p-5 shadow-xs space-y-4 animate-view-slide">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 2xl:w-6 2xl:h-6 text-[#F59E0B]" />
              <div>
                <h3 className="text-xs 2xl:text-sm font-bold uppercase tracking-wider font-mono text-[#0F172A]">
                  Quick Executive Digest / Ringkasan Laporan Ready-to-Copy
                </h3>
                <p className="text-xs 2xl:text-sm text-[#475569]">
                  Ringkasan siap salin untuk pesan WhatsApp grup operasional atau Memo Direksi
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyDigest}
              className="btn-hover-lift flex items-center space-x-2 min-h-[38px] 2xl:min-h-[42px] px-4 py-2 bg-[#0F172A] hover:bg-[#1E293B] text-white font-mono text-xs 2xl:text-sm font-bold rounded-[2px] cursor-pointer shadow-xs"
            >
              {copiedDigest ? (
                <>
                  <Check className="h-4 w-4 text-[#4ADE80]" />
                  <span>Tercopy ke Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  <span>Copy Ringkasan Laporan</span>
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <textarea
              readOnly
              rows={16}
              value={quickDigestText}
              className="w-full p-4 bg-[#F8FAFC] border border-[#CBD5E1] rounded-[2px] font-mono text-xs 2xl:text-sm text-[#0F172A] leading-relaxed focus:outline-none resize-y"
            />
          </div>

          <div className="flex items-center justify-between text-xs 2xl:text-sm text-[#64748B] font-mono pt-1">
            <span>Format: Markdown WhatsApp (*bold*, list bullet)</span>
            <span>Total karakter: {quickDigestText.length} char</span>
          </div>
        </div>
      )}
    </div>
  );
};
