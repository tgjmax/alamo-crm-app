import { FormEvent, useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  createCustomer,
  updateCustomer,
  getPassportDownloadUrl,
  uploadPassportFile,
  CustomerListItem,
  CustomerPassportInput,
} from '@/api/customers.api';
import { isoToMdy, mdyToIso } from '@/utils/dateFormat';

interface AddEditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer?: CustomerListItem | null;
}

const emptyForm = {
  firstName: '',
  middleName: '',
  lastName: '',
  dob: '',
  gender: 'M',
  verified: false,
  phone: '',
  email: '',
  passportNumber: '',
  passportIssuingCountry: '',
  passportExpiryDate: '',
};

export function AddEditCustomerDialog({ open, onOpenChange, customer }: AddEditCustomerDialogProps) {
  const [form, setForm] = useState(emptyForm);
  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [hasExistingPhoto, setHasExistingPhoto] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [passportActionError, setPassportActionError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const isEdit = Boolean(customer);

  useEffect(() => {
    if (!open) return;
    setPassportFile(null);
    setFormError(null);
    setPassportActionError(null);
    if (customer) {
      setForm({
        firstName: customer.firstName,
        middleName: customer.middleName ?? '',
        lastName: customer.lastName,
        dob: mdyToIso(customer.dob),
        gender: customer.gender,
        verified: customer.verified,
        phone: customer.phone,
        email: customer.email ?? '',
        passportNumber: customer.passport?.number ?? '',
        passportIssuingCountry: customer.passport?.issuingCountry ?? '',
        passportExpiryDate: customer.passport?.expiryDate ?? '',
      });
      setHasExistingPhoto(Boolean(customer.passport?.hasPhoto));
    } else {
      setForm(emptyForm);
      setHasExistingPhoto(false);
    }
  }, [open, customer]);

  const mutation = useMutation({
    mutationFn: async () => {
      const passportTouched =
        form.passportNumber.trim() || form.passportIssuingCountry.trim() || form.passportExpiryDate || passportFile;
      let passport: CustomerPassportInput | undefined;
      if (passportTouched) {
        let photoS3Key: string | undefined;
        if (passportFile) {
          photoS3Key = await uploadPassportFile(passportFile);
        }
        passport = {
          number: form.passportNumber,
          issuingCountry: form.passportIssuingCountry,
          expiryDate: form.passportExpiryDate,
          photoS3Key,
        };
      }
      const payload = {
        firstName: form.firstName,
        middleName: form.middleName || undefined,
        lastName: form.lastName,
        dob: isoToMdy(form.dob),
        gender: form.gender,
        phone: form.phone,
        email: form.email || undefined,
        verified: form.verified,
        passport,
      };
      return isEdit ? updateCustomer(customer!.id, payload) : createCustomer(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers', 'list'] });
      queryClient.invalidateQueries({ queryKey: ['customers', 'search'] });
      onOpenChange(false);
    },
  });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const passportTouched = Boolean(
      form.passportNumber.trim() || form.passportIssuingCountry.trim() || form.passportExpiryDate || passportFile
    );
    if (
      passportTouched &&
      (!form.passportNumber.trim() || !form.passportIssuingCountry.trim() || !form.passportExpiryDate)
    ) {
      setFormError('Passport number, issuing country, and expiry date are all required together.');
      return;
    }
    mutation.mutate();
  }

  async function handleViewPassport(download: boolean) {
    if (!customer) return;
    setPassportActionError(null);
    try {
      const url = await getPassportDownloadUrl(customer.id, download);
      window.open(url, '_blank');
    } catch {
      setPassportActionError('Could not load the passport document. Check your connection and try again.');
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit customer' : 'Add customer'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Personal Information</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-first-name">First name</Label>
                <Input
                  id="customer-first-name"
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-middle-name">Middle name</Label>
                <Input
                  id="customer-middle-name"
                  value={form.middleName}
                  onChange={(e) => setForm({ ...form, middleName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-last-name">Last name</Label>
                <Input
                  id="customer-last-name"
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-dob">Date of birth</Label>
                <Input
                  id="customer-dob"
                  type="date"
                  value={form.dob}
                  onChange={(e) => setForm({ ...form, dob: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-gender">Gender</Label>
                <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                  <SelectTrigger id="customer-gender" aria-label="Gender">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                    <SelectItem value="U">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end pb-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="customer-verified"
                    checked={form.verified}
                    onCheckedChange={(v) => setForm({ ...form, verified: !!v })}
                  />
                  <Label htmlFor="customer-verified">Verified</Label>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-phone">Phone</Label>
                <Input
                  id="customer-phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-email">Email</Label>
                <Input
                  id="customer-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
            </div>
          </div>

          <div className="space-y-4 border-t pt-4">
            <h3 className="text-sm font-semibold">Passport Details</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="customer-passport-number">Passport #</Label>
                <Input
                  id="customer-passport-number"
                  value={form.passportNumber}
                  onChange={(e) => setForm({ ...form, passportNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-passport-country">Issuing Country</Label>
                <Input
                  id="customer-passport-country"
                  value={form.passportIssuingCountry}
                  onChange={(e) => setForm({ ...form, passportIssuingCountry: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customer-passport-expiry">Expiry Date</Label>
                <Input
                  id="customer-passport-expiry"
                  type="date"
                  value={form.passportExpiryDate}
                  onChange={(e) => setForm({ ...form, passportExpiryDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer-passport-file">Upload passport</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="customer-passport-file"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setPassportFile(e.target.files?.[0] ?? null)}
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!isEdit || !hasExistingPhoto}
                  aria-label="View passport document"
                  onClick={() => handleViewPassport(false)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  disabled={!isEdit || !hasExistingPhoto}
                  aria-label="Download passport document"
                  onClick={() => handleViewPassport(true)}
                >
                  <Download className="h-4 w-4" />
                </Button>
              </div>
              {passportActionError && <p className="text-sm text-destructive">{passportActionError}</p>}
            </div>
          </div>

          {formError && <p className="text-sm text-destructive">{formError}</p>}
          {mutation.isError && (
            <p className="text-sm text-destructive">Save failed. Check your connection and try again.</p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
