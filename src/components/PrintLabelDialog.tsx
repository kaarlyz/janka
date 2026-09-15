import React, { useEffect } from 'react';
import { QrCode, MessageCircle, Printer, X } from 'lucide-react';
import { ShipmentEntry } from '../types';
import { formatRupiah } from '../lib/formatters';

interface PrintLabelDialogProps {
  entry: ShipmentEntry | null;
  onClose: () => void;
  onSendWhatsApp: (entry: ShipmentEntry) => void;
}

// SVG Barcode Component for authentic thermal shipping labels
function BarcodePattern({ code }: { code: string }) {
  const bars = Array.from(code).flatMap((char, i) => {
    const n = char.charCodeAt(0) % 5;
    return [
      { width: 2 + (n % 3), gap: 2 + ((n + i) % 2) },
      { width: 1 + (n % 2), gap: 2 + (i % 3) },
      { width: 3 - (n % 2), gap: 1 + (n % 2) },
    ];
  });

  let currentX = 10;
  return (
    <svg className="w-full h-12" viewBox="0 0 320 50" preserveAspectRatio="none">
      {bars.map((bar, idx) => {
        const x = currentX;
        currentX += bar.width + bar.gap;
        if (x > 310) return null;
        return <rect key={idx} x={x} y={2} width={bar.width} height={46} fill="#000000" />;
      })}
    </svg>
  );
}

export const PrintLabelDialog: React.FC<PrintLabelDialogProps> = ({
  entry,
  onClose,
  onSendWhatsApp,
}) => {
  // ESC key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!entry) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-[2px] overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-[#D5D9E0] rounded-[3px] p-4 sm:p-5 shadow-2xl my-4 text-[#0F172A] max-h-[92vh] flex flex-col justify-between overflow-y-auto">
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="no-print flex items-center justify-between pb-3 border-b border-[#E2E8F0] mb-3">
          <div className="flex items-center space-x-2">
            <QrCode className="h-4 w-4 text-[#0F172A]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0F172A]">
              Pratinjau Label Resi 100x150mm
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onSendWhatsApp(entry)}
              className="btn-hover-lift inline-flex items-center space-x-1 min-h-[36px] px-2.5 py-1 rounded-[2px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs transition cursor-pointer"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-700" />
              <span className="hidden sm:inline">Kirim WA</span>
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="btn-hover-lift inline-flex items-center space-x-1.5 min-h-[36px] px-3 py-1 rounded-[2px] bg-[#0F172A] text-white font-bold text-xs hover:bg-[#1E293B] transition cursor-pointer shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak Label</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="btn-hover-lift p-1.5 rounded-[2px] text-[#475569] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition cursor-pointer"
              title="Tutup Pratinjau (ESC)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Outer Scroll Container for Mobile Screen Scaled Label */}
        <div className="w-full flex justify-center py-2 overflow-x-auto">
          {/* Physical Thermal Shipping Label (100x150mm proportional thermal card) */}
          <div
            id="shipping-label-card"
            className="w-full max-w-[340px] sm:max-w-[370px] aspect-[2/3] bg-white text-black p-4 rounded-[2px] border-2 border-black font-sans shadow-md flex flex-col justify-between select-none"
          >
            <div className="flex items-center justify-between border-b-2 border-black pb-2">
              <div className="flex items-center space-x-1.5">
                <span className="bg-black text-white px-2 py-0.5 text-xs font-black tracking-wider uppercase rounded-sm">
                  {entry.serviceType.includes('J&T') ? 'J&T EXPRESS' : 'JNE EXPRESS'}
                </span>
                <span className="border border-black px-1.5 py-0.5 text-[10px] font-mono font-bold">
                  EZ / REGULER
                </span>
              </div>
              <div className="text-right font-mono text-xs">
                <span className="font-bold text-xs block">CGK-HUB01</span>
                <span className="text-[10px] text-zinc-600">{entry.date}</span>
              </div>
            </div>

            <div className="py-2 text-center border-b-2 border-black">
              <div className="max-w-[260px] mx-auto">
                <BarcodePattern code={entry.resiNumber} />
              </div>
              <div className="mt-1 font-mono text-sm sm:text-base font-black tracking-widest">
                {entry.resiNumber}
              </div>
            </div>

            <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black text-xs flex-1">
              <div className="p-2 space-y-0.5">
                <p className="text-[9px] font-mono font-bold uppercase text-zinc-600">PENGIRIM (SENDER):</p>
                <p className="font-bold text-zinc-900 leading-tight">{entry.senderName}</p>
                <p className="text-[10px] text-zinc-700 leading-tight">{entry.senderAddress || '-'}</p>
              </div>

              <div className="p-2 space-y-0.5 bg-zinc-50">
                <p className="text-[9px] font-mono font-bold uppercase text-zinc-600">PENERIMA (RECEIVER):</p>
                <p className="font-bold text-zinc-900 leading-tight">{entry.receiverName}</p>
                <p className="text-[10px] text-zinc-700 leading-tight">{entry.receiverAddress || '-'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 divide-x-2 divide-black border-b-2 border-black text-center text-xs font-mono py-1.5 bg-zinc-100">
              <div>
                <span className="block text-[8px] text-zinc-500 uppercase">BERAT:</span>
                <strong className="text-xs font-bold text-black">{entry.weight} Kg</strong>
              </div>
              <div>
                <span className="block text-[8px] text-zinc-500 uppercase">BIAYA ONGKIR:</span>
                <strong className="text-xs font-bold text-black">{formatRupiah(entry.amount)}</strong>
              </div>
              <div>
                <span className="block text-[8px] text-zinc-500 uppercase">PEMBAYARAN:</span>
                <strong className="text-[10px] font-bold text-black block truncate px-1">
                  {entry.paymentType.toUpperCase()}
                </strong>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between text-[10px]">
              <div className="max-w-[180px] space-y-0.5 text-zinc-600">
                <p className="font-mono text-[9px] font-bold">Janka Logistics Engine</p>
                <p className="text-[8px] leading-tight">Periksa kondisi paket sebelum tanda tangan.</p>
              </div>
              <div className="border border-dashed border-zinc-400 p-1 w-20 text-center rounded">
                <span className="text-[8px] text-zinc-500 block">Tanda Tangan</span>
                <div className="h-3" />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Note */}
        <div className="no-print mt-3 pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] text-[#475569]">
          <span>Format standar 100x150mm (Proporsional A6)</span>
          <span className="font-mono text-[10px]">Tekan ESC untuk menutup</span>
        </div>
      </div>
    </div>
  );
};
