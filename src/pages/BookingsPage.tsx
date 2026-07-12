import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookingsTable } from '@/components/bookings/bookings-table';
import { CreateBookingDialog } from '@/components/bookings/create-booking-dialog';
import { ImportBookingsDialog } from '@/components/bookings/import-bookings-dialog';
import { ExportBookingsDialog } from '@/components/bookings/export-bookings-dialog';
import { VoidedInvoicesDialog } from '@/components/bookings/voided-invoices-dialog';
import { SendInvoiceDialog } from '@/components/bookings/send-invoice-dialog';

export default function BookingsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showVoided, setShowVoided] = useState(false);
  const [showSendInvoice, setShowSendInvoice] = useState(false);

  return (
    <div className="mx-auto max-w-[1800px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-2xl font-bold tracking-tight">Bookings</h2>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => setShowVoided(true)}>
            Voided Invoices
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowSendInvoice(true)}>
            Send Invoice
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowExport(true)}>
            Export
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => setShowImport(true)}>
            Import Bookings
          </Button>
          <Button type="button" size="sm" onClick={() => setShowCreate(true)}>
            Create booking
          </Button>
        </div>
      </div>

      <BookingsTable queryKeyPrefix="bookings" defaultPageSize={25} />

      <CreateBookingDialog open={showCreate} onOpenChange={setShowCreate} />
      <ImportBookingsDialog open={showImport} onOpenChange={setShowImport} />
      <ExportBookingsDialog open={showExport} onOpenChange={setShowExport} />
      <VoidedInvoicesDialog open={showVoided} onOpenChange={setShowVoided} />
      <SendInvoiceDialog open={showSendInvoice} onOpenChange={setShowSendInvoice} />
    </div>
  );
}
