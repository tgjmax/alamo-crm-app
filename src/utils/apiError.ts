import { isAxiosError } from 'axios';
import type { DuplicateInvoice } from '@/api/bookings.api';

/** Extracts a backend-provided error message (`err.response.data.error.message`) from an Axios
 * error, falling back to a generic caller-supplied message otherwise (network failure, an
 * unexpected response shape, etc). The backend's guard errors (e.g. 409 `HAS_ADJUSTMENTS`, 409
 * `DUPLICATE_BOOKING_WARNING`, 400 `PAYMENT_AMOUNT_EXCEEDS_TOTAL`) are conditions the user can
 * actually act on, so their real messages should reach the screen instead of a generic
 * "check your connection" line that sends the user into an unfixable retry loop. Originally
 * lived only in `delete-booking-dialog.tsx`; pulled out here so every mutation-error surface
 * (delete, edit booking, edit adjustment, …) shares one implementation instead of drifting. */
export function errorMessage(err: unknown, fallback: string): string {
  if (isAxiosError(err)) {
    const message = (err.response?.data as { error?: { message?: string } } | undefined)?.error?.message;
    if (message) return message;
  }
  return fallback;
}

/**
 * The backend warns (409 DUPLICATE_BOOKING_WARNING) rather than refusing when an invoice number +
 * booking date + PNR all match an existing booking — invoice numbers legitimately repeat. Returns
 * the colliding invoice so the form can show the user what they are about to duplicate, or null
 * for any other error.
 */
export function duplicateInvoice(err: unknown): DuplicateInvoice | null {
  if (!isAxiosError(err)) return null;
  const error = (err.response?.data as { error?: { code?: string; duplicate?: DuplicateInvoice } } | undefined)?.error;
  if (error?.code !== 'DUPLICATE_BOOKING_WARNING' || !error.duplicate) return null;
  return error.duplicate;
}
