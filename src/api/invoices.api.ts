import { apiClient } from './client';

export interface InvoiceLineItemInput {
  description: string;
  date: string; // YYYY-MM-DD or ''
  qty: number;
  cost: number;
}

export interface SendInvoiceInput {
  toEmail: string;
  invoiceNumber: string;
  invoiceDate: string; // YYYY-MM-DD
  billingToName: string;
  billingToLines: string;
  lineItems: InvoiceLineItemInput[];
  taxPct: number;
  terms: string;
}

export async function sendInvoice(input: SendInvoiceInput): Promise<{ sent: boolean }> {
  const res = await apiClient.post<{ sent: boolean }>('/invoices/send', input);
  return res.data;
}
