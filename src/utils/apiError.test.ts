import { AxiosError, AxiosResponse } from 'axios';
import { duplicateInvoice } from './apiError';

function axios409(data: unknown): AxiosError {
  const err = new AxiosError('Request failed');
  err.response = { status: 409, data } as AxiosResponse;
  return err;
}

describe('duplicateInvoice', () => {
  it('extracts the duplicate from a DUPLICATE_BOOKING_WARNING 409', () => {
    const err = axios409({
      error: {
        message: 'Invoice 000005 already exists…',
        code: 'DUPLICATE_BOOKING_WARNING',
        duplicate: {
          id: 'b1',
          invoiceNumber: '000005',
          bookingDate: '2026-01-03',
          pnr: 'GUDBFX',
          passengerNames: ['John Smith'],
        },
      },
    });

    expect(duplicateInvoice(err)).toEqual({
      id: 'b1',
      invoiceNumber: '000005',
      bookingDate: '2026-01-03',
      pnr: 'GUDBFX',
      passengerNames: ['John Smith'],
    });
  });

  it('returns null for any other error', () => {
    expect(duplicateInvoice(axios409({ error: { code: 'HAS_ADJUSTMENTS' } }))).toBeNull();
    expect(duplicateInvoice(new Error('network'))).toBeNull();
  });
});
