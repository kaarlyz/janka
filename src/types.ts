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
}
