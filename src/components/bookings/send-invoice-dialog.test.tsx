import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { SendInvoiceDialog } from './send-invoice-dialog';
import * as bookingsApi from '@/api/bookings.api';
import * as invoicesApi from '@/api/invoices.api';
import * as organizationApi from '@/api/organization.api';

function renderDialog() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <SendInvoiceDialog open onOpenChange={vi.fn()} />
    </QueryClientProvider>
  );
}

const PAX_A: bookingsApi.BookingRow = {
  id: 'p1',
  invoiceNumber: '0000150',
  bookingDate: '2026-05-04',
  passengerName: 'JOSEPH/SHINY S',
  amount: 2400,
  pnr: 'GUDBFX',
  airlineCode: 'QR',
  depCity: 'DXB',
  arrCity: 'COK',
  depDate: '2026-05-08',
  arrDate: '2026-05-28',
  paymentStatus: 'paid',
  bookingType: 'New',
  bookingId: 'bk0',
};

const PAX_REFUND: bookingsApi.BookingRow = {
  ...PAX_A,
  id: 'p2',
  passengerName: 'JOSEPH/ANTON',
  amount: 150,
  bookingType: 'Refund',
  bookingId: undefined,
};

beforeEach(() => {
  vi.spyOn(organizationApi, 'getBranding').mockResolvedValue({
    name: 'Alamo Travels',
    tagline: 'Internal CRM',
    logoUrl: null,
    invoiceTerms: 'All sales are final.',
    timeZone: 'America/Chicago',
  });
  vi.spyOn(bookingsApi, 'listBookings').mockResolvedValue({
    bookings: [PAX_A, PAX_REFUND],
    total: 2,
    page: 1,
    pageSize: 50,
  });
});

async function searchAndPick() {
  await userEvent.type(screen.getByLabelText('Search PNR'), 'GUD');
  await userEvent.click(await screen.findByRole('button', { name: /GUDBFX — 0000150 — 2 passengers/ }));
}

describe('SendInvoiceDialog', () => {
  it('prefills from a PNR pick — including Reissue/Refund rows — while everything stays editable', async () => {
    renderDialog();
    await searchAndPick();

    expect(screen.getByLabelText('Invoice number')).toHaveValue('0000150');
    expect(screen.getByLabelText('Billing to name')).toHaveValue('JOSEPH/SHINY S');
    const descriptions = screen.getAllByLabelText(/Line description/);
    expect(descriptions).toHaveLength(2); // Refund row included, unlike the adjustment form
    expect(descriptions[0]).toHaveValue('Air Ticket – JOSEPH/SHINY S – GUDBFX – DXB→COK, 08 May 2026 – 28 May 2026');
    expect(screen.getAllByLabelText(/Line cost/)[0]).toHaveValue(2400);

    await userEvent.clear(screen.getByLabelText('Invoice number'));
    await userEvent.type(screen.getByLabelText('Invoice number'), 'CUSTOM-1');
    expect(screen.getByLabelText('Invoice number')).toHaveValue('CUSTOM-1');
  });

  it('prefills terms from org settings', async () => {
    renderDialog();
    expect(await screen.findByLabelText('Terms & conditions')).toHaveValue('All sales are final.');
  });

  it('computes subtotal and grand total live, applying the tax percentage', async () => {
    renderDialog();
    await searchAndPick();

    expect(screen.getByText('Subtotal: $2550.00')).toBeInTheDocument();
    await userEvent.clear(screen.getByLabelText('Tax %'));
    await userEvent.type(screen.getByLabelText('Tax %'), '10');
    expect(screen.getByText('Grand total: $2805.00')).toBeInTheDocument();
  });

  it('adds and removes line-item rows', async () => {
    renderDialog();
    await searchAndPick();

    await userEvent.click(screen.getByRole('button', { name: 'Add line' }));
    expect(screen.getAllByLabelText(/Line description/)).toHaveLength(3);

    await userEvent.click(screen.getAllByRole('button', { name: 'Remove line' })[2]);
    expect(screen.getAllByLabelText(/Line description/)).toHaveLength(2);
  });

  it('sends the full payload and shows the success state', async () => {
    const send = vi.spyOn(invoicesApi, 'sendInvoice').mockResolvedValue({ sent: true });
    renderDialog();
    await searchAndPick();

    await userEvent.type(screen.getByLabelText('To email'), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send invoice' }));

    await waitFor(() => {
      expect(send).toHaveBeenCalledWith(
        expect.objectContaining({
          toEmail: 'customer@example.com',
          invoiceNumber: '0000150',
          billingToName: 'JOSEPH/SHINY S',
          taxPct: 0,
          terms: 'All sales are final.',
          lineItems: [
            expect.objectContaining({ qty: 1, cost: 2400, date: '2026-05-04' }),
            expect.objectContaining({ qty: 1, cost: 150 }),
          ],
        })
      );
    });
    expect(await screen.findByText('Invoice sent to customer@example.com')).toBeInTheDocument();
  });

  it('shows an inline error and keeps the form when sending fails', async () => {
    vi.spyOn(invoicesApi, 'sendInvoice').mockRejectedValue(new Error('boom'));
    renderDialog();
    await searchAndPick();

    await userEvent.type(screen.getByLabelText('To email'), 'customer@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send invoice' }));

    expect(await screen.findByText('Could not send the invoice. Please try again.')).toBeInTheDocument();
    expect(screen.getByLabelText('To email')).toHaveValue('customer@example.com');
  });
});
