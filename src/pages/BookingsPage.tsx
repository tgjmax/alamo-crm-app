import { FormEvent, Fragment, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookingListItem, PassengerListItem, createAdjustment, listBookings } from '../api/bookings.api';
import { CreateBookingDialog } from '@/components/bookings/create-booking-dialog';
import { ImportBookingsDialog } from '@/components/bookings/import-bookings-dialog';
import { ExportBookingsDialog } from '@/components/bookings/export-bookings-dialog';

const emptyAdjustmentForm = {
  bookingType: 'Reissue' as 'Reissue' | 'Refund',
  pnr: '',
  airlineCode: '',
  depCity: '',
  arrCity: '',
  depDate: '',
  arrDate: '',
  amount: '',
};

function PaymentStatusBadge({ status }: { status: 'paid' | 'pending' }) {
  if (status === 'paid') {
    return (
      <Badge className="border-green-200 bg-green-100 text-green-800 hover:bg-green-100 dark:border-green-800 dark:bg-green-950 dark:text-green-300">
        Paid
      </Badge>
    );
  }
  return (
    <Badge className="border-red-200 bg-red-100 text-red-800 hover:bg-red-100 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
      Pending
    </Badge>
  );
}

interface FlatRow {
  booking: BookingListItem;
  passenger: PassengerListItem;
}

export default function BookingsPage() {
  const [adjustingPassengerId, setAdjustingPassengerId] = useState<string | null>(null);
  const [adjustmentForm, setAdjustmentForm] = useState(emptyAdjustmentForm);
  const [showCreate, setShowCreate] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data: bookingData } = useQuery({
    queryKey: ['bookings', page],
    queryFn: () => listBookings(page),
  });
  const bookings = bookingData?.bookings ?? [];
  const total = bookingData?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / (bookingData?.pageSize ?? 50)));

  const flatRows: FlatRow[] = bookings.flatMap((booking) =>
    booking.passengers.map((passenger) => ({ booking, passenger }))
  );

  const adjustmentMutation = useMutation({
    mutationFn: ({ passengerId, input }: { passengerId: string; input: Parameters<typeof createAdjustment>[1] }) =>
      createAdjustment(passengerId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      setAdjustingPassengerId(null);
      setAdjustmentForm(emptyAdjustmentForm);
    },
  });

  function handleAdjustmentSubmit(e: FormEvent, passengerId: string) {
    e.preventDefault();
    adjustmentMutation.mutate({
      passengerId,
      input: {
        bookingType: adjustmentForm.bookingType,
        amount: Number(adjustmentForm.amount),
        pnr: adjustmentForm.pnr,
        airlineCode: adjustmentForm.airlineCode || undefined,
        depCity: adjustmentForm.depCity || undefined,
        arrCity: adjustmentForm.arrCity || undefined,
        depDate: adjustmentForm.depDate || undefined,
        arrDate: adjustmentForm.arrDate || undefined,
        payment: { status: 'paid', type: 'card' },
      },
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4">
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

      <div className="rounded-md border">
        {flatRows.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">No bookings yet.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="whitespace-nowrap">Date</TableHead>
                <TableHead className="whitespace-nowrap">Invoice#</TableHead>
                <TableHead className="whitespace-nowrap">Name of PAX</TableHead>
                <TableHead className="whitespace-nowrap">Amount</TableHead>
                <TableHead className="whitespace-nowrap">PNR</TableHead>
                <TableHead className="whitespace-nowrap">Airlines</TableHead>
                <TableHead className="whitespace-nowrap">Departure City</TableHead>
                <TableHead className="whitespace-nowrap">Arrival City</TableHead>
                <TableHead className="whitespace-nowrap">Departure Date</TableHead>
                <TableHead className="whitespace-nowrap">Arrival Date</TableHead>
                <TableHead className="whitespace-nowrap text-center">Payment Status</TableHead>
                <TableHead className="whitespace-nowrap">Remark</TableHead>
                <TableHead className="whitespace-nowrap" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {flatRows.map(({ booking, passenger }) => (
                <Fragment key={passenger.id}>
                  <TableRow>
                    <TableCell className="whitespace-nowrap">{booking.bookingDate}</TableCell>
                    <TableCell className="whitespace-nowrap font-medium">{booking.invoiceNumber}</TableCell>
                    <TableCell className="whitespace-nowrap">{passenger.passengerName}</TableCell>
                    <TableCell className="whitespace-nowrap">${passenger.amount}</TableCell>
                    <TableCell className="whitespace-nowrap">{booking.pnr}</TableCell>
                    <TableCell className="whitespace-nowrap">{booking.airlineCode}</TableCell>
                    <TableCell className="whitespace-nowrap">{booking.depCity}</TableCell>
                    <TableCell className="whitespace-nowrap">{booking.arrCity}</TableCell>
                    <TableCell className="whitespace-nowrap">{booking.depDate}</TableCell>
                    <TableCell className="whitespace-nowrap">{booking.arrDate}</TableCell>
                    <TableCell className="whitespace-nowrap text-center">
                      {booking.payment ? (
                        <PaymentStatusBadge status={booking.payment.status} />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-muted-foreground">{booking.remark}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button
                        type="button"
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-xs"
                        onClick={() => setAdjustingPassengerId(passenger.id)}
                      >
                        Reissue/Refund
                      </Button>
                    </TableCell>
                  </TableRow>
                  {adjustingPassengerId === passenger.id && (
                    <TableRow>
                      <TableCell colSpan={13}>
                        <form
                          onSubmit={(e) => handleAdjustmentSubmit(e, passenger.id)}
                          className="space-y-2"
                        >
                          <Select
                            value={adjustmentForm.bookingType}
                            onValueChange={(v) =>
                              setAdjustmentForm({ ...adjustmentForm, bookingType: v as 'Reissue' | 'Refund' })
                            }
                          >
                            <SelectTrigger aria-label="Adjustment type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Reissue">Reissue</SelectItem>
                              <SelectItem value="Refund">Refund</SelectItem>
                            </SelectContent>
                          </Select>
                          <Input
                            aria-label="Adjustment PNR"
                            value={adjustmentForm.pnr}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, pnr: e.target.value })}
                            required
                          />
                          <Input
                            aria-label="Adjustment airline code"
                            value={adjustmentForm.airlineCode}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, airlineCode: e.target.value })}
                          />
                          <Input
                            aria-label="Adjustment departure city"
                            value={adjustmentForm.depCity}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, depCity: e.target.value })}
                          />
                          <Input
                            aria-label="Adjustment arrival city"
                            value={adjustmentForm.arrCity}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, arrCity: e.target.value })}
                          />
                          <Input
                            aria-label="Adjustment departure date"
                            type="date"
                            value={adjustmentForm.depDate}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, depDate: e.target.value })}
                          />
                          <Input
                            aria-label="Adjustment arrival date"
                            type="date"
                            value={adjustmentForm.arrDate}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, arrDate: e.target.value })}
                          />
                          <Input
                            aria-label="Adjustment amount"
                            type="number"
                            value={adjustmentForm.amount}
                            onChange={(e) => setAdjustmentForm({ ...adjustmentForm, amount: e.target.value })}
                            required
                          />
                          <Button type="submit" size="sm">
                            Save adjustment
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          Page {page} of {totalPages} ({total} total)
        </span>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </Button>
        </div>
      </div>

      <CreateBookingDialog open={showCreate} onOpenChange={setShowCreate} />
      <ImportBookingsDialog open={showImport} onOpenChange={setShowImport} />
      <ExportBookingsDialog open={showExport} onOpenChange={setShowExport} />
    </div>
  );
}
