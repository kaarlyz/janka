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
  onSendWhatsApp
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-[2px] overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white border border-slate-300 rounded-[3px] p-5 shadow-2xl my-8 text-slate-900">
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="no-print flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
          <div className="flex items-center space-x-2">
            <QrCode className="h-4 w-4 text-slate-700" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
              Pratinjau Label Resi Termal
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onSendWhatsApp(entry)}
              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-[2px] bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-xs transition cursor-pointer"
            >
              <MessageCircle className="h-3.5 w-3.5 text-emerald-700" />
              <span>Kirim WA</span>
            </button>
            <button
              onClick={() => window.print()}
              className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-[2px] bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition cursor-pointer shadow-sm"
            >
              <Printer className="h-3.5 w-3.5" />
              <span>Cetak Label</span>
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-[2px] text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Physical Thermal Shipping Label (Print Isolated) */}
        <div 
          id="shipping-label-card"
          className="bg-white text-black p-5 rounded-[2px] border-2 border-black font-sans shadow-inner selection:bg-black selection:text-white"
        >
          <div className="flex items-center justify-between border-b-2 border-black pb-2.5">
            <div className="flex items-center space-x-2">
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

          <div className="py-2.5 text-center border-b-2 border-black">
            <div className="max-w-[260px] mx-auto">
              <BarcodePattern code={entry.resiNumber} />
            </div>
            <div className="mt-1 font-mono text-base font-black tracking-widest">
              {entry.resiNumber}
            </div>
          </div>

          <div className="grid grid-cols-2 divide-x-2 divide-black border-b-2 border-black text-xs">
            <div className="p-2 space-y-0.5">
              <p className="text-[9px] font-mono font-bold uppercase text-zinc-600">PENGIRIM (SENDER):</p>
              <p className="font-bold text-zinc-900">{entry.senderName}</p>
              <p className="text-[10px] text-zinc-700 leading-tight">{entry.senderAddress || '-'}</p>
            </div>

            <div className="p-2 space-y-0.5 bg-zinc-50">
              <p className="text-[9px] font-mono font-bold uppercase text-zinc-600">PENERIMA (RECEIVER):</p>
              <p className="font-bold text-zinc-900">{entry.receiverName}</p>
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
              <strong className="text-[10px] font-bold text-black block truncate px-1">{entry.paymentType.toUpperCase()}</strong>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between text-[10px]">
            <div className="max-w-[200px] space-y-0.5 text-zinc-600">
              <p className="font-mono text-[9px]">Janka Logistics Engine</p>
              <p className="text-[8px]">Periksa kondisi paket sebelum tanda tangan.</p>
            </div>
            <div className="border border-dashed border-zinc-400 p-1.5 w-24 text-center rounded">
              <span className="text-[8px] text-zinc-500 block">Tanda Tangan</span>
              <div className="h-4" />
            </div>
          </div>
        </div>

        <div className="no-print mt-3 flex items-center justify-between text-[11px] text-slate-500">
          <span>Format standar A6 Thermal Label 100x150mm</span>
          <span className="font-mono">ESC atau klik X untuk menutup</span>
        </div>
      </div>
    </div>
  );
};
