import { FormEvent, useState } from 'react';
import { useRouter } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/password-input';
import { useQueryClient } from '@tanstack/react-query';
import { useBranding, BRANDING_QUERY_KEY } from '@/hooks/useBranding';
import { loginRequest } from '../api/auth.api';
import { useAuthStore } from '../stores/authStore';
import { errorMessage } from '@/utils/apiError';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const setSession = useAuthStore((s) => s.setSession);
  const router = useRouter();
  const branding = useBranding();
  const queryClient = useQueryClient();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { accessToken, user } = await loginRequest(email, password);
      setSession(accessToken, user);
      // The branding cached while this page was anonymous is deliberately incomplete — the API
      // withholds `invoiceTerms` from callers with no token. Without this the terms-less copy
      // would satisfy `useBranding` for its full 4-minute staleTime, long enough for the
      // send-invoice dialog to open with empty terms. Must run AFTER setSession so the refetch
      // carries the new access token.
      await queryClient.invalidateQueries({ queryKey: BRANDING_QUERY_KEY });
      await router.navigate({ to: '/dashboard' });
    } catch (err) {
      // Surface the server's own message — it distinguishes a bad password (401
      // INVALID_CREDENTIALS) from a deactivated account (403 ACCOUNT_DEACTIVATED), and
      // telling a deactivated user their password is wrong sends them, and the admin they
      // call, chasing a password that is perfectly correct. The generic fallback still
      // covers a network failure, where we genuinely do not know what went wrong.
      setError(errorMessage(err, 'Invalid email or password'));
    }
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-background p-4">
      <img src={branding.logoUrl ?? '/logo.png'} alt={branding.name} className="h-40 w-40" />
      <p className="text-sm text-muted-foreground">{branding.tagline}</p>
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-xl">
            <h1 className="contents">Sign in</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-email" required>Email</Label>
              <Input id="login-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="login-password" required>Password</Label>
              <PasswordInput
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full">
              Sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
