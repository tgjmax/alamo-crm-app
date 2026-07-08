import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import CustomersPage from './CustomersPage';
import * as customersApi from '../api/customers.api';

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient();
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const BASE_CUSTOMER = {
  id: '1',
  firstName: 'Alexander',
  lastName: 'Varghese',
  middleName: 'Reginald',
  givenName: 'Alexander Reginald',
  paxType: 'ADT' as const,
  dob: '01-Jan-1980',
  gender: 'M',
  phone: '555-0100',
  email: 'alex@example.com',
  verified: true,
  passport: {
    number: 'P1234567',
    issuingCountry: 'US',
    expiryDate: '2030-01-01',
    hasPhoto: true,
  },
};

describe('CustomersPage', () => {
  beforeEach(() => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({ customers: [], total: 0, page: 1, pageSize: 25 });
  });

  it('lists a customer with every required column', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [BASE_CUSTOMER],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    renderWithClient(<CustomersPage />);

    expect(await screen.findByText('Varghese/Alexander Reginald')).toBeInTheDocument();
    expect(screen.getByText('Alexander Reginald')).toBeInTheDocument();
    expect(screen.getByText('Varghese')).toBeInTheDocument();
    expect(screen.getByText('01-Jan-1980')).toBeInTheDocument();
    expect(screen.getByText('ADT')).toBeInTheDocument();
    expect(screen.getByText('Male')).toBeInTheDocument();
    expect(screen.getByText('alex@example.com')).toBeInTheDocument();
    expect(screen.getByText('555-0100')).toBeInTheDocument();
    expect(screen.getByLabelText('Verified')).toBeInTheDocument();
  });

  it('truncates a long Ticketing Name and Email with an ellipsis and a full-text tooltip', async () => {
    const longTicketingCustomer = {
      ...BASE_CUSTOMER,
      lastName: 'VerylongLastNameIndeed',
      firstName: 'AVeryLongFirstNameToo',
      middleName: undefined,
      email: 'a.very.long.email.address.for.testing@example.com',
    };
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [longTicketingCustomer],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    renderWithClient(<CustomersPage />);

    const ticketingName = 'VerylongLastNameIndeed/AVeryLongFirstNameToo';
    const ticketingSpan = await screen.findByTitle(ticketingName);
    expect(ticketingSpan).toHaveClass('text-ellipsis');
    expect(ticketingSpan.style.maxWidth).toBe('25ch');

    const emailSpan = screen.getByTitle('a.very.long.email.address.for.testing@example.com');
    expect(emailSpan).toHaveClass('text-ellipsis');
    expect(emailSpan.style.maxWidth).toBe('30ch');
  });

  it('shows Female and Other gender badges', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [
        { ...BASE_CUSTOMER, id: '2', gender: 'F' },
        { ...BASE_CUSTOMER, id: '3', gender: 'U' },
      ],
      total: 2,
      page: 1,
      pageSize: 25,
    });
    renderWithClient(<CustomersPage />);
    expect(await screen.findByText('Female')).toBeInTheDocument();
    expect(screen.getByText('Other')).toBeInTheDocument();
  });

  it('opens the View Passport popup from the list and shows passport details with working document buttons', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [BASE_CUSTOMER],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    vi.spyOn(customersApi, 'getPassportDownloadUrl').mockResolvedValue('https://signed.example.com/passport.jpg');
    const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
    renderWithClient(<CustomersPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'View passport for Alexander Varghese' }));
    expect(await screen.findByText('P1234567')).toBeInTheDocument();
    expect(screen.getByText('US')).toBeInTheDocument();
    expect(screen.getByText('2030-01-01')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'View document' }));
    await waitFor(() => {
      expect(customersApi.getPassportDownloadUrl).toHaveBeenCalledWith('1', false);
      expect(openSpy).toHaveBeenCalledWith('https://signed.example.com/passport.jpg', '_blank');
    });

    await userEvent.click(screen.getByRole('button', { name: 'Download document' }));
    await waitFor(() => {
      expect(customersApi.getPassportDownloadUrl).toHaveBeenCalledWith('1', true);
    });
  });

  it('disables the passport view icon when a customer has no passport on file', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [{ ...BASE_CUSTOMER, passport: undefined }],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    renderWithClient(<CustomersPage />);
    expect(await screen.findByRole('button', { name: 'View passport for Alexander Varghese' })).toBeDisabled();
  });

  it('shows a red X icon for an unverified customer', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [{ ...BASE_CUSTOMER, verified: false }],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    renderWithClient(<CustomersPage />);
    expect(await screen.findByLabelText('Not verified')).toBeInTheDocument();
  });

  it('copies the Ticketing Name, Email, and Phone values to the clipboard', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [BASE_CUSTOMER],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    renderWithClient(<CustomersPage />);
    await screen.findByText('alex@example.com');

    await userEvent.click(screen.getByRole('button', { name: 'Copy Varghese/Alexander Reginald' }));
    expect(writeText).toHaveBeenLastCalledWith('Varghese/Alexander Reginald');

    await userEvent.click(screen.getByRole('button', { name: 'Copy alex@example.com' }));
    expect(writeText).toHaveBeenLastCalledWith('alex@example.com');

    await userEvent.click(screen.getByRole('button', { name: 'Copy 555-0100' }));
    expect(writeText).toHaveBeenLastCalledWith('555-0100');

    expect(writeText).toHaveBeenCalledTimes(3);
  });

  it('copies the Date of Birth to the clipboard with dashes stripped (DDMMMYYYY)', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [BASE_CUSTOMER],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue(undefined);
    renderWithClient(<CustomersPage />);
    await screen.findByText('01-Jan-1980');

    await userEvent.click(screen.getByRole('button', { name: 'Copy 01Jan1980' }));
    expect(writeText).toHaveBeenLastCalledWith('01Jan1980');
  });

  it('debounces the search box into a server-side query param', async () => {
    renderWithClient(<CustomersPage />);
    await userEvent.type(screen.getByLabelText('Search customers'), 'Var');

    await waitFor(() => {
      const lastCall = vi.mocked(customersApi.listCustomers).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({ q: 'Var' });
    });
  });

  it('filters by status via the faceted filter', async () => {
    renderWithClient(<CustomersPage />);
    await userEvent.click(screen.getByRole('button', { name: /Status/ }));
    await userEvent.click(await screen.findByRole('option', { name: 'Verified' }));

    await waitFor(() => {
      const lastCall = vi.mocked(customersApi.listCustomers).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({ status: 'verified' });
    });
  });

  it('sorts by Given Name when its column header is clicked', async () => {
    renderWithClient(<CustomersPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Given Name/ }));

    await waitFor(() => {
      const lastCall = vi.mocked(customersApi.listCustomers).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({ sortBy: 'givenName', sortDir: 'asc' });
    });
  });

  it('sorts by Ticketing Name when its column header is clicked, mapping to the lastName sortBy', async () => {
    renderWithClient(<CustomersPage />);
    await userEvent.click(await screen.findByRole('button', { name: /Ticketing Name/ }));

    await waitFor(() => {
      const lastCall = vi.mocked(customersApi.listCustomers).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({ sortBy: 'lastName', sortDir: 'asc' });
    });
  });

  it('changes rows per page via the pagination footer', async () => {
    renderWithClient(<CustomersPage />);
    await userEvent.click(screen.getByRole('combobox', { name: 'Rows per page' }));
    await userEvent.click(await screen.findByRole('option', { name: '50' }));

    await waitFor(() => {
      const lastCall = vi.mocked(customersApi.listCustomers).mock.calls.slice(-1)[0]?.[0];
      expect(lastCall).toMatchObject({ pageSize: 50 });
    });
  });

  it('paginates via numbered page links', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockImplementation((params = {}) =>
      Promise.resolve({
        customers: [{ ...BASE_CUSTOMER, id: String(params.page ?? 1), firstName: `Page${params.page ?? 1}` }],
        total: 100,
        page: params.page ?? 1,
        pageSize: 25,
      })
    );
    renderWithClient(<CustomersPage />);

    expect(await screen.findByText('Varghese/Page1 Reginald')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('link', { name: '2' }));
    expect(await screen.findByText('Varghese/Page2 Reginald')).toBeInTheDocument();
  });

  it('creates a new customer via the Add Customer dialog', async () => {
    vi.spyOn(customersApi, 'createCustomer').mockResolvedValue({ id: '2' });
    renderWithClient(<CustomersPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Add Customer' }));

    await userEvent.type(screen.getByLabelText('First name'), 'New');
    await userEvent.type(screen.getByLabelText('Middle name'), 'Middleton');
    await userEvent.type(screen.getByLabelText('Last name'), 'Customer');
    await userEvent.type(screen.getByLabelText('Date of birth'), '1990-05-15');
    await userEvent.type(screen.getByLabelText('Phone'), '555-0199');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(customersApi.createCustomer).toHaveBeenCalled();
      const [firstCallArgs] = vi.mocked(customersApi.createCustomer).mock.calls[0];
      expect(firstCallArgs).toEqual(
        expect.objectContaining({
          firstName: 'New',
          middleName: 'Middleton',
          lastName: 'Customer',
          dob: '15-May-1990',
          phone: '555-0199',
        })
      );
    });
  });

  it('lets the user pick a Gender in the Add Customer dialog', async () => {
    vi.spyOn(customersApi, 'createCustomer').mockResolvedValue({ id: '2' });
    renderWithClient(<CustomersPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Add Customer' }));

    await userEvent.click(screen.getByRole('combobox', { name: 'Gender' }));
    await userEvent.click(await screen.findByRole('option', { name: 'Female' }));

    await userEvent.type(screen.getByLabelText('First name'), 'New');
    await userEvent.type(screen.getByLabelText('Last name'), 'Customer');
    await userEvent.type(screen.getByLabelText('Date of birth'), '1990-05-15');
    await userEvent.type(screen.getByLabelText('Phone'), '555-0199');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(customersApi.createCustomer).toHaveBeenCalledWith(expect.objectContaining({ gender: 'F' }));
    });
  });

  it('the Add Customer dialog disables passport view/download (no customer id yet)', async () => {
    renderWithClient(<CustomersPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Add Customer' }));
    expect(screen.getByRole('button', { name: 'View passport document' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Download passport document' })).toBeDisabled();
  });

  it('rejects a partially filled passport section', async () => {
    const createSpy = vi.spyOn(customersApi, 'createCustomer').mockResolvedValue({ id: '2' });
    renderWithClient(<CustomersPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Add Customer' }));

    await userEvent.type(screen.getByLabelText('First name'), 'New');
    await userEvent.type(screen.getByLabelText('Last name'), 'Customer');
    await userEvent.type(screen.getByLabelText('Date of birth'), '1990-05-15');
    await userEvent.type(screen.getByLabelText('Phone'), '555-0199');
    await userEvent.type(screen.getByLabelText('Passport #'), 'P0000000');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(
      await screen.findByText('Passport number, issuing country, and expiry date are all required together.')
    ).toBeInTheDocument();
    expect(createSpy).not.toHaveBeenCalled();
  });

  it('uploads a passport file then submits the resulting key when creating a customer', async () => {
    vi.spyOn(customersApi, 'createCustomer').mockResolvedValue({ id: '2' });
    vi.spyOn(customersApi, 'uploadPassportFile').mockResolvedValue('passports/new-key.jpg');
    renderWithClient(<CustomersPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Add Customer' }));

    await userEvent.type(screen.getByLabelText('First name'), 'New');
    await userEvent.type(screen.getByLabelText('Last name'), 'Customer');
    await userEvent.type(screen.getByLabelText('Date of birth'), '1990-05-15');
    await userEvent.type(screen.getByLabelText('Phone'), '555-0199');
    await userEvent.type(screen.getByLabelText('Passport #'), 'P0000000');
    await userEvent.type(screen.getByLabelText('Issuing Country'), 'US');
    await userEvent.type(screen.getByLabelText('Expiry Date'), '2035-01-01');
    const file = new File(['dummy'], 'passport.jpg', { type: 'image/jpeg' });
    await userEvent.upload(screen.getByLabelText('Upload passport'), file);
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(customersApi.uploadPassportFile).toHaveBeenCalledWith(file);
      expect(customersApi.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({
          passport: {
            number: 'P0000000',
            issuingCountry: 'US',
            expiryDate: '2035-01-01',
            photoS3Key: 'passports/new-key.jpg',
          },
        })
      );
    });
  });

  it('edits an existing customer via the row actions menu', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [BASE_CUSTOMER],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    vi.spyOn(customersApi, 'updateCustomer').mockResolvedValue({ id: '1' });
    renderWithClient(<CustomersPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Row actions for Alexander Varghese' }));
    await userEvent.click(await screen.findByText('Edit'));
    expect(await screen.findByText('Edit customer')).toBeInTheDocument();
    expect(screen.getByLabelText('First name')).toHaveValue('Alexander');

    await userEvent.clear(screen.getByLabelText('First name'));
    await userEvent.type(screen.getByLabelText('First name'), 'Updated');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(customersApi.updateCustomer).toHaveBeenCalledWith('1', expect.objectContaining({ firstName: 'Updated' }));
    });
  });

  it('enables passport view/download in the Edit dialog when the customer already has a photo on file', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [BASE_CUSTOMER],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    renderWithClient(<CustomersPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Row actions for Alexander Varghese' }));
    await userEvent.click(await screen.findByText('Edit'));
    expect(await screen.findByLabelText('Passport #')).toHaveValue('P1234567');
    expect(screen.getByRole('button', { name: 'View passport document' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Download passport document' })).toBeEnabled();
  });

  it('deletes a single customer via the row actions menu', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [BASE_CUSTOMER],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    vi.spyOn(customersApi, 'bulkDeleteCustomers').mockResolvedValue({ deletedCount: 1 });
    renderWithClient(<CustomersPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Row actions for Alexander Varghese' }));
    await userEvent.click(await screen.findByText('Delete'));
    expect(await screen.findByText('Delete customer?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(customersApi.bulkDeleteCustomers).toHaveBeenCalledWith(['1']);
    });
  });

  it('selects multiple rows and bulk deletes them', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [BASE_CUSTOMER, { ...BASE_CUSTOMER, id: '2', firstName: 'Bob', lastName: 'Second' }],
      total: 2,
      page: 1,
      pageSize: 25,
    });
    vi.spyOn(customersApi, 'bulkDeleteCustomers').mockResolvedValue({ deletedCount: 2 });
    renderWithClient(<CustomersPage />);

    await userEvent.click(await screen.findByLabelText('Select Alexander Varghese'));
    await userEvent.click(await screen.findByLabelText('Select Bob Second'));
    await userEvent.click(screen.getByRole('button', { name: 'Delete (2)' }));
    expect(await screen.findByText('Delete 2 customers?')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => {
      expect(customersApi.bulkDeleteCustomers).toHaveBeenCalledWith(expect.arrayContaining(['1', '2']));
    });
  });

  it('toggles column visibility via the View dropdown', async () => {
    vi.spyOn(customersApi, 'listCustomers').mockResolvedValue({
      customers: [BASE_CUSTOMER],
      total: 1,
      page: 1,
      pageSize: 25,
    });
    renderWithClient(<CustomersPage />);
    await screen.findByText('alex@example.com');

    await userEvent.click(screen.getByRole('button', { name: 'View' }));
    await userEvent.click(await screen.findByRole('menuitemcheckbox', { name: 'Email' }));

    await waitFor(() => {
      expect(screen.queryByText('alex@example.com')).not.toBeInTheDocument();
    });
  });

  it('imports customers via the Import Customers dialog', async () => {
    renderWithClient(<CustomersPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Import Customers' }));
    expect(await screen.findByLabelText('Customer import file')).toBeInTheDocument();
  });

  it('exports customers via the Export dialog', async () => {
    vi.spyOn(customersApi, 'exportCustomers').mockResolvedValue(undefined);
    renderWithClient(<CustomersPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    expect(await screen.findByText('Export customers')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    await waitFor(() => expect(customersApi.exportCustomers).toHaveBeenCalled());
  });

  it('shows an error in the export dialog when export fails', async () => {
    vi.spyOn(customersApi, 'exportCustomers').mockRejectedValueOnce(new Error('network down'));
    renderWithClient(<CustomersPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));
    await userEvent.click(screen.getByRole('button', { name: 'Export' }));

    expect(await screen.findByText('Export failed. Check your connection and try again.')).toBeInTheDocument();
  });
});
