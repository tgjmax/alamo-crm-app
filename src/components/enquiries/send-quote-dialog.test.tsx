import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { SendQuoteDialog } from './send-quote-dialog';
import * as enquiriesApi from '@/api/enquiries.api';

function renderDialog(enquiry: enquiriesApi.Enquiry) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const result = render(
    <QueryClientProvider client={client}>
      <SendQuoteDialog open onOpenChange={vi.fn()} enquiry={enquiry} />
    </QueryClientProvider>
  );
  const rerenderDialog = (nextEnquiry: enquiriesApi.Enquiry) =>
    result.rerender(
      <QueryClientProvider client={client}>
        <SendQuoteDialog open onOpenChange={vi.fn()} enquiry={nextEnquiry} />
      </QueryClientProvider>
    );
  return { ...result, rerenderDialog };
}

const ENQUIRY: enquiriesApi.Enquiry = {
  id: 'e1',
  enquirer: { name: 'Johny', email: 'johny@example.com' },
  trip: {
    tripType: 'round' as const,
    segments: [
      { from: 'IAH', to: 'LAX', date: '2026-07-08' },
      { from: 'LAX', to: 'IAH', date: '2026-07-12' },
    ],
    dateFlexibility: '±3 days',
    pax: { adults: 2, children: 1, infants: 0 },
    budgetPerPax: 1200,
    cabins: ['Business' as const],
    preferredAirlines: ['QR'],
    stops: 'nonstop' as const,
  },
  status: 'New',
  fareOptions: [
    { airlineName: 'Spirit Airlines', pricePerPax: 220, segments: [{ from: 'IAH', to: 'LAX', date: '2026-07-08' }] },
    { airlineName: 'United Airlines', pricePerPax: 470, segments: [{ from: 'IAH', to: 'LAX', date: '2026-07-08' }] },
  ],
  quoteSentAt: null,
  createdAt: '2026-07-12T10:00:00.000Z',
};

describe('SendQuoteDialog', () => {
  it('prefills the recipient from the enquiry and checks all options by default', () => {
    renderDialog(ENQUIRY);
    expect(screen.getByLabelText('To email')).toHaveValue('johny@example.com');
    expect(screen.getByRole('checkbox', { name: /Option 1: Spirit Airlines/ })).toBeChecked();
    expect(screen.getByRole('checkbox', { name: /Option 2: United Airlines/ })).toBeChecked();
  });

  it('sends only the checked options with the personal message, then shows success', async () => {
    const send = vi.spyOn(enquiriesApi, 'sendEnquiryQuote').mockResolvedValue({ sent: true });
    renderDialog(ENQUIRY);

    await userEvent.click(screen.getByRole('checkbox', { name: /Option 1: Spirit Airlines/ }));
    await userEvent.type(screen.getByLabelText('Personal message (optional)'), 'Prices valid until Friday.');
    await userEvent.click(screen.getByRole('button', { name: 'Send quote' }));

    await waitFor(() => {
      expect(send).toHaveBeenCalledWith('e1', {
        toEmail: 'johny@example.com',
        optionIndexes: [1],
        personalMessage: 'Prices valid until Friday.',
      });
    });
    expect(await screen.findByText('Quote sent to johny@example.com')).toBeInTheDocument();
  });

  it('shows a plain-text preview reflecting the checked options', async () => {
    renderDialog(ENQUIRY);
    const preview = screen.getByLabelText('Email preview');
    expect(preview).toHaveTextContent('Dear Johny,');
    expect(preview).toHaveTextContent('Spirit Airlines - USD220.00 per passenger');
    expect(preview).toHaveTextContent('United Airlines - USD470.00 per passenger');

    await userEvent.click(screen.getByRole('checkbox', { name: /Option 1: Spirit Airlines/ }));
    expect(preview).not.toHaveTextContent('Spirit Airlines - USD220.00 per passenger');
  });

  it('disables sending when no option is checked', async () => {
    renderDialog(ENQUIRY);
    await userEvent.click(screen.getByRole('checkbox', { name: /Option 1: Spirit Airlines/ }));
    await userEvent.click(screen.getByRole('checkbox', { name: /Option 2: United Airlines/ }));
    expect(screen.getByRole('button', { name: 'Send quote' })).toBeDisabled();
  });

  it('shows an inline error and keeps the form when sending fails', async () => {
    vi.spyOn(enquiriesApi, 'sendEnquiryQuote').mockRejectedValue(new Error('boom'));
    renderDialog(ENQUIRY);

    await userEvent.click(screen.getByRole('button', { name: 'Send quote' }));

    expect(await screen.findByText('Could not send the quote. Please try again.')).toBeInTheDocument();
    expect(screen.getByLabelText('To email')).toHaveValue('johny@example.com');
  });

  it('keeps the success state when the enquiry object changes identity while the dialog is open', async () => {
    vi.spyOn(enquiriesApi, 'sendEnquiryQuote').mockResolvedValue({ sent: true });
    const { rerenderDialog } = renderDialog(ENQUIRY);

    await userEvent.click(screen.getByRole('button', { name: 'Send quote' }));
    expect(await screen.findByText('Quote sent to johny@example.com')).toBeInTheDocument();

    // Simulates the real detail-page scenario: the send invalidates ['enquiries'], the sibling
    // detail query refetches and hands the still-open dialog a NEW enquiry object (now Quoted).
    rerenderDialog({ ...ENQUIRY, status: 'Quoted' });

    expect(screen.getByText('Quote sent to johny@example.com')).toBeInTheDocument();
  });
});
