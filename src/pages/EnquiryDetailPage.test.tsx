import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import EnquiryDetailPage from './EnquiryDetailPage';
import * as enquiriesApi from '../api/enquiries.api';
import * as flightDataApi from '../api/flightData.api';

const navigateMock = vi.fn();
vi.mock('@tanstack/react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@tanstack/react-router')>()),
  useNavigate: () => navigateMock,
  useParams: () => ({ enquiryId: 'e1' }),
}));

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const OPTION: enquiriesApi.EnquiryFareOption = {
  airlineCode: 'NK',
  airlineName: 'Spirit Airlines',
  pricePerPax: 220,
  baggageNotes: 'Personal baggage might be allowed.',
  segments: [{ from: 'IAH', to: 'LAX', date: '2026-07-08', departTime: '06:20', arriveTime: '07:47' }],
};

const ENQUIRY: enquiriesApi.Enquiry = {
  id: 'e1',
  enquirer: { name: 'Johny Smith', phone: '555-0100', email: 'johny@example.com' },
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
  notes: 'Morning preferred',
  status: 'New',
  fareOptions: [OPTION],
  quoteSentAt: null,
  createdAt: '2026-07-12T10:00:00.000Z',
};

describe('EnquiryDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(enquiriesApi, 'getEnquiry').mockResolvedValue(ENQUIRY);
    vi.spyOn(flightDataApi, 'searchAirports').mockResolvedValue([]);
    vi.spyOn(flightDataApi, 'searchAirlines').mockResolvedValue([]);
  });

  it('renders enquirer, trip, notes, status, and the saved fare options', async () => {
    renderWithClient(<EnquiryDetailPage />);
    expect(await screen.findByText('Johny Smith')).toBeInTheDocument();
    expect(screen.getByText(/555-0100/)).toBeInTheDocument();
    expect(screen.getByText(/IAH → LAX/)).toBeInTheDocument();
    expect(screen.getByText(/±3 days/)).toBeInTheDocument();
    expect(screen.getByText('Morning preferred')).toBeInTheDocument();
    expect(screen.getByText(/Spirit Airlines/)).toBeInTheDocument();
    expect(screen.getByText(/USD220.00 per passenger/)).toBeInTheDocument();
    expect(screen.getByText(/IAH to LAX/)).toBeInTheDocument();
  });

  it('changes status via the status select (PATCH)', async () => {
    const update = vi.spyOn(enquiriesApi, 'updateEnquiry').mockResolvedValue({ ...ENQUIRY, status: 'Booked' });
    renderWithClient(<EnquiryDetailPage />);
    await screen.findByText('Johny Smith');

    await userEvent.click(screen.getByRole('combobox', { name: 'Status' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Booked' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith('e1', { status: 'Booked' });
    });
  });

  it('adds a fare option via the dialog and PATCHes the whole array', async () => {
    const update = vi.spyOn(enquiriesApi, 'updateEnquiry').mockResolvedValue(ENQUIRY);
    renderWithClient(<EnquiryDetailPage />);
    await screen.findByText('Johny Smith');

    await userEvent.click(screen.getByRole('button', { name: 'Add fare option' }));
    await userEvent.type(screen.getByLabelText('Airline'), 'United Airlines');
    await userEvent.type(screen.getByLabelText('Price per passenger'), '470');
    await userEvent.type(screen.getByLabelText('Segment 1 from'), 'IAH');
    await userEvent.type(screen.getByLabelText('Segment 1 to'), 'LAX');
    await userEvent.type(screen.getByLabelText('Segment 1 date'), '2026-07-08');
    await userEvent.type(screen.getByLabelText('Segment 1 depart time'), '07:36');
    await userEvent.type(screen.getByLabelText('Segment 1 arrive time'), '09:05');
    await userEvent.type(screen.getByLabelText('Baggage notes'), 'Carry-on baggage is allowed.');
    await userEvent.click(screen.getByRole('button', { name: 'Save option' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith('e1', {
        fareOptions: [
          OPTION,
          {
            airlineCode: undefined,
            airlineName: 'United Airlines',
            pricePerPax: 470,
            baggageNotes: 'Carry-on baggage is allowed.',
            segments: [{ from: 'IAH', to: 'LAX', date: '2026-07-08', departTime: '07:36', arriveTime: '09:05' }],
          },
        ],
      });
    });
  });

  it('adds and removes segment rows inside the option dialog (min 1)', async () => {
    renderWithClient(<EnquiryDetailPage />);
    await screen.findByText('Johny Smith');
    await userEvent.click(screen.getByRole('button', { name: 'Add fare option' }));

    expect(screen.getByRole('button', { name: 'Remove segment 1' })).toBeDisabled();
    await userEvent.click(screen.getByRole('button', { name: 'Add segment' }));
    expect(screen.getByLabelText('Segment 2 from')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Remove segment 2' }));
    expect(screen.queryByLabelText('Segment 2 from')).not.toBeInTheDocument();
  });

  it('removes a fare option', async () => {
    const update = vi.spyOn(enquiriesApi, 'updateEnquiry').mockResolvedValue({ ...ENQUIRY, fareOptions: [] });
    renderWithClient(<EnquiryDetailPage />);
    await screen.findByText('Johny Smith');

    await userEvent.click(screen.getByRole('button', { name: 'Remove option 1' }));
    await waitFor(() => {
      expect(update).toHaveBeenCalledWith('e1', { fareOptions: [] });
    });
  });

  it('deletes the enquiry after confirm and navigates back to the list', async () => {
    const del = vi.spyOn(enquiriesApi, 'deleteEnquiry').mockResolvedValue(undefined);
    renderWithClient(<EnquiryDetailPage />);
    await screen.findByText('Johny Smith');

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
    await userEvent.click(await screen.findByRole('button', { name: 'Delete enquiry' }));

    await waitFor(() => {
      expect(del).toHaveBeenCalledWith('e1');
      expect(navigateMock).toHaveBeenCalledWith({ to: '/enquiries' });
    });
  });
});
