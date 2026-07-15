import { ChangeEvent, FormEvent, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Branding, updateBranding, uploadLogoFile } from '@/api/organization.api';
import { BRANDING_QUERY_KEY } from '@/hooks/useBranding';

/** Common agency timezones. The backend validates any IANA zone, so this list is convenience, not a
 * constraint — the current stored value is always merged in below so the picker is never blank. */
const TIME_ZONE_OPTIONS: { value: string; label: string }[] = [
  { value: 'America/Chicago', label: 'Central — Texas (CT)' },
  { value: 'America/New_York', label: 'Eastern (ET)' },
  { value: 'America/Denver', label: 'Mountain (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific (PT)' },
  { value: 'America/Anchorage', label: 'Alaska (AKT)' },
  { value: 'Pacific/Honolulu', label: 'Hawaii (HST)' },
  { value: 'Asia/Kolkata', label: 'India (IST)' },
  { value: 'Asia/Dubai', label: 'Gulf (GST)' },
  { value: 'Europe/London', label: 'United Kingdom (UK)' },
  { value: 'UTC', label: 'UTC' },
];

interface OrganizationTabProps {
  branding: Branding;
}

export function OrganizationTab({ branding }: OrganizationTabProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(branding.name);
  const [tagline, setTagline] = useState(branding.tagline);
  const [invoiceTerms, setInvoiceTerms] = useState(branding.invoiceTerms ?? '');
  const [timeZone, setTimeZone] = useState(branding.timeZone);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(branding.logoUrl);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setLogoFile(file);
    if (file) {
      setPreviewUrl(URL.createObjectURL(file));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    try {
      let logoS3Key: string | undefined;
      if (logoFile) {
        logoS3Key = await uploadLogoFile(logoFile);
      }
      await updateBranding({ name, tagline, invoiceTerms, timeZone, ...(logoS3Key ? { logoS3Key } : {}) });
      await queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
      setSuccess(true);
    } catch {
      setError('Could not save organization branding. Please try again.');
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <h2 className="contents">Organization</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="org-name">Organization name</Label>
            <Input id="org-name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-tagline">Tagline</Label>
            <Input id="org-tagline" value={tagline} onChange={(e) => setTagline(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-logo">Logo</Label>
            {previewUrl && <img src={previewUrl} alt="Logo preview" className="h-16 w-16 rounded object-cover" />}
            {/* PNG/JPEG only — the invoice PDF generator (pdfkit) can't embed other image formats. */}
            <Input id="org-logo" type="file" accept=".png,.jpg,.jpeg,image/png,image/jpeg" onChange={handleFileChange} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="org-invoice-terms">Invoice terms & conditions</Label>
            <Textarea
              id="org-invoice-terms"
              value={invoiceTerms}
              onChange={(e) => setInvoiceTerms(e.target.value)}
              rows={4}
              placeholder="Shown at the bottom of emailed invoices"
            />
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Select value={timeZone} onValueChange={setTimeZone}>
              <SelectTrigger aria-label="Timezone" className="max-w-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(TIME_ZONE_OPTIONS.some((o) => o.value === timeZone)
                  ? TIME_ZONE_OPTIONS
                  : [{ value: timeZone, label: timeZone }, ...TIME_ZONE_OPTIONS]
                ).map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Sets what "today" and "this month" mean across Sales and the dashboard. Does not change how any
              booking date is displayed.
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          {success && <p className="text-sm text-muted-foreground">Organization branding saved.</p>}
          <Button type="submit">Save organization</Button>
        </form>
      </CardContent>
    </Card>
  );
}
