import { useState, useEffect, useMemo, useCallback } from 'react';
import { ShipmentEntry, CourierRateConfig } from '../types';

export const STORAGE_KEY = 'janka_shipments_v1';
export const RATES_STORAGE_KEY = 'janka_rates_v1';

export const DEFAULT_RATES: CourierRateConfig = {
  JT: 12000,
  JNE: 10000,
};

export const INITIAL_SHIPMENTS: ShipmentEntry[] = [
  {
    id: 'shp-01',
    date: '15 Sep 2026',
    resiNumber: 'JT2026782910',
    senderName: 'Gudang Pusat Jakarta',
    senderAddress: 'Jl. Daan Mogot No. 45, Jakarta Barat',
    receiverName: 'PT Maju Bersama',
    receiverAddress: 'Jl. Pemuda No. 12, Semarang',
    weight: 2.5,
    serviceType: 'J&T - Reguler',
    amount: 30000,
    paymentType: 'Petty Cash',
    createdAt: '2026-09-15T08:00:00.000Z'
  },
  {
    id: 'shp-02',
    date: '15 Sep 2026',
    resiNumber: 'JNE2026491823',
    senderName: 'Divisi Logistik JKT',
    senderAddress: 'Kawasan Industri Pulogadung, Jakarta Timur',
    receiverName: 'Klinik Sehat Utama',
    receiverAddress: 'Jl. Riau No. 88, Bandung',
    weight: 1.0,
    serviceType: 'JNE - Reguler',
    amount: 10000,
    paymentType: 'Petty Cash',
    createdAt: '2026-09-15T09:30:00.000Z'
  }
];

export function useShipments() {
  // 1. Shipments State with corrupt fallback
  const [shipments, setShipments] = useState<ShipmentEntry[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Normalize entries in case of legacy shape
          return parsed.map((item: any, idx: number) => ({
            id: item.id || `shp-${Date.now()}-${idx}`,
            date: item.date || '15 Sep 2026',
            resiNumber: item.resiNumber || `RESI-${idx}`,
            senderName: item.senderName || 'Pengirim',
            senderAddress: item.senderAddress || '',
            receiverName: item.receiverName || 'Penerima',
            receiverAddress: item.receiverAddress || '',
            weight: typeof item.weight === 'number' ? item.weight : parseFloat(item.weight) || 1.0,
            serviceType: item.serviceType || 'J&T - Reguler',
            amount: typeof item.amount === 'number' ? item.amount : parseInt(item.amount, 10) || 10000,
            paymentType: item.paymentType || 'Petty Cash',
            createdAt: item.createdAt || new Date().toISOString()
          }));
        }
      }
    } catch (err) {
      console.warn('[Janka] Failed to parse shipments from localStorage, falling back to seed records', err);
    }
    return INITIAL_SHIPMENTS;
  });

  // 2. Persist shipments
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(shipments));
    } catch (err) {
      console.error('[Janka] Failed to save shipments to localStorage', err);
    }
  }, [shipments]);

  // 3. Courier Rates State
  const [rates, setRates] = useState<CourierRateConfig>(() => {
    try {
      const raw = localStorage.getItem(RATES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.JT === 'number' && typeof parsed.JNE === 'number') {
          return parsed;
        }
      }
    } catch (err) {
      console.warn('[Janka] Failed to parse rates from localStorage, using default rates', err);
    }
    return DEFAULT_RATES;
  });

  useEffect(() => {
    try {
      localStorage.setItem(RATES_STORAGE_KEY, JSON.stringify(rates));
    } catch (err) {
      console.error('[Janka] Failed to save rates to localStorage', err);
    }
  }, [rates]);

  // 4. Rate Calculation helper
  const calculateRate = useCallback((courier: 'JT' | 'JNE', weight: number): number => {
    const ratePerKg = rates[courier] || DEFAULT_RATES[courier];
    const roundedKg = Math.max(1, Math.ceil(weight));
    return roundedKg * ratePerKg;
  }, [rates]);

  // 5. Update Rates
  const updateRates = useCallback((newRates: Partial<CourierRateConfig>) => {
    setRates(prev => ({
      ...prev,
      ...newRates
    }));
  }, []);

  // 6. CRUD: Add
  const addShipment = useCallback((entry: Omit<ShipmentEntry, 'id'>): ShipmentEntry => {
    const newEntry: ShipmentEntry = {
      ...entry,
      id: `shp-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      createdAt: entry.createdAt || new Date().toISOString()
    };
    setShipments(prev => [newEntry, ...prev]);
    return newEntry;
  }, []);

  // 7. CRUD: Update
  const updateShipment = useCallback((id: string, updatedFields: Partial<ShipmentEntry>) => {
    setShipments(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, ...updatedFields };
      }
      return item;
    }));
  }, []);

  // 8. CRUD: Delete
  const deleteShipment = useCallback((id: string) => {
    setShipments(prev => prev.filter(item => item.id !== id));
  }, []);

  // 9. Reconcile against whole dataset (irrespective of any active UI filters)
  const reconcileAll = useCallback((resiMap: Map<string, string>): number => {
    let updatedCount = 0;
    setShipments(prev => prev.map(item => {
      const normResi = item.resiNumber.trim().toUpperCase();
      if (resiMap.has(normResi)) {
        const newSeller = resiMap.get(normResi)!;
        if (newSeller !== item.senderName) {
          updatedCount++;
          return {
            ...item,
            senderName: newSeller
          };
        }
      }
      return item;
    }));
    return updatedCount;
  }, []);

  // 10. Address Book: distinct senders for fast autocomplete
  const addressBook = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of shipments) {
      if (s.senderName?.trim() && !map.has(s.senderName.trim())) {
        map.set(s.senderName.trim(), s.senderAddress?.trim() || '');
      }
    }
    return Array.from(map.entries()).map(([name, address]) => ({ name, address }));
  }, [shipments]);

  return {
    shipments,
    rates,
    updateRates,
    calculateRate,
    addShipment,
    updateShipment,
    deleteShipment,
    reconcileAll,
    addressBook,
    setShipments
  };
}
