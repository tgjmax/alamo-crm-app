import { useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CustomerListItem, getPassportDownloadUrl } from '@/api/customers.api';

interface ViewPassportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerListItem | null;
}

export function ViewPassportDialog({ open, onOpenChange, customer }: ViewPassportDialogProps) {
  const [error, setError] = useState<string | null>(null);
  const passport = customer?.passport;

  async function handleOpenDoc(download: boolean) {
    if (!customer) return;
    setError(null);
    try {
      const url = await getPassportDownloadUrl(customer.id, download);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      setError('Could not load the passport document. Check your connection and try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Passport details{customer ? ` — ${customer.firstName} ${customer.lastName}` : ''}
          </DialogTitle>
        </DialogHeader>
        {!passport ? (
          <p className="text-sm text-muted-foreground">No passport on file.</p>
        ) : (
          <div className="space-y-4">
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-muted-foreground">Passport #</dt>
                <dd>{passport.number ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Issuing Country</dt>
                <dd>{passport.issuingCountry}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expiry Date</dt>
                <dd>{passport.expiryDate}</dd>
              </div>
            </dl>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!passport.hasPhoto}
                onClick={() => handleOpenDoc(false)}
              >
                <Eye className="mr-2 h-4 w-4" />
                View document
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!passport.hasPhoto}
                onClick={() => handleOpenDoc(true)}
              >
                <Download className="mr-2 h-4 w-4" />
                Download document
              </Button>
            </div>
            {!passport.hasPhoto && <p className="text-sm text-muted-foreground">No document uploaded.</p>}
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
