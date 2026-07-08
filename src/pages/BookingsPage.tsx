import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { BookingsTable } from '@/components/bookings/bookings-table';
import { CreateBookingDialog } from '@/components/bookings/create-booking-dialog';
import { ImportBookingsDialog } from '@/components/bookings/import-bookings-dialog';
import { ExportBookingsDialog } from '@/components/bookings/export-bookings-dialog';

export default function BookingsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);

  return (
    <div className="mx-auto max-w-[1800px] space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-semibold">Bookings</h2>
        <div className="flex gap-2">
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
    </div>
  );
}
