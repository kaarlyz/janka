export interface ShipmentEntry {
  id: string;
  date: string;
  resiNumber: string;
  senderName: string;
  senderAddress: string;
  receiverName: string;
  receiverAddress: string;
  weight: number;
  serviceType: string;
  amount: number;
  paymentType: string;
  createdAt?: string; // ISO string for precise date filtering & sorting
}

export type CourierCode = 'JT' | 'JNE';

export interface CourierRateConfig {
  JT: number;  // Default 12000
  JNE: number; // Default 10000
}

export interface FilterState {
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  courier: 'ALL' | 'JT' | 'JNE';
  search: string;
}

export type SortField = 'date' | 'resiNumber' | 'senderName' | 'receiverName' | 'weight' | 'amount';
export type SortOrder = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export interface SummaryMetrics {
  totalShipments: number;
  totalAmount: number;
  totalWeight: number;
  avgCostPerKg: number;
  courierBreakdown: {
    JT: { count: number; amount: number; weight: number };
    JNE: { count: number; amount: number; weight: number };
  };
}
