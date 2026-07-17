import { ChangeEvent, FormEvent, useRef, useState } from 'react';
import { Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PasswordInput } from '@/components/password-input';
import { AuthUser, useAuthStore } from '@/stores/authStore';
import { updateProfile, uploadProfilePhotoFile } from '@/api/users.api';

interface ProfileTabProps {
  user: AuthUser;
}

export function ProfileTab({ user }: ProfileTabProps) {
  const setUser = useAuthStore((s) => s.setUser);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(user.name);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(user.photoUrl ?? null);
  const [photoSaving, setPhotoSaving] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [email, setEmail] = useState(user.email);
  const [emailCurrentPassword, setEmailCurrentPassword] = useState('');
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const emailChanged = email !== user.email;

  async function handlePhotoFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;
    setPhotoError(null);
    setPhotoSaving(true);
    const localPreviewUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(localPreviewUrl);
    try {
      const photoS3Key = await uploadProfilePhotoFile(file);
      const updated = await updateProfile({ photoS3Key });
      setUser(updated);
      setPhotoPreviewUrl(updated.photoUrl ?? null);
    } catch {
      setPhotoError('Could not update profile picture. Please try again.');
      setPhotoPreviewUrl(user.photoUrl ?? null);
    } finally {
      setPhotoSaving(false);
    }
  }

  async function handleRemovePhoto() {
    setPhotoError(null);
    setPhotoSaving(true);
    try {
      const updated = await updateProfile({ photoS3Key: null });
      setUser(updated);
      setPhotoPreviewUrl(null);
    } catch {
      setPhotoError('Could not remove profile picture. Please try again.');
    } finally {
      setPhotoSaving(false);
    }
  }

  async function handleProfileSubmit(e: FormEvent) {
    e.preventDefault();
    setProfileError(null);
    setProfileSuccess(false);
    try {
      const updated = await updateProfile({
        name,
        email,
        ...(emailChanged ? { currentPassword: emailCurrentPassword } : {}),
      });
      setUser(updated);
      setEmailCurrentPassword('');
      setProfileSuccess(true);
    } catch {
      setProfileError('Could not save profile. Check your current password and try again.');
    }
  }

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  async function handlePasswordSubmit(e: FormEvent) {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(false);
    if (newPassword !== confirmNewPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }
    try {
      await updateProfile({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmNewPassword('');
      setPasswordSuccess(true);
    } catch {
      setPasswordError('Could not change password. Check your current password and try again.');
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h2 className="contents">Profile Information</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  aria-label="Change profile picture"
                  disabled={photoSaving}
                  className="relative size-24 shrink-0 rounded-full disabled:opacity-70"
                >
                  <div className="flex size-24 items-center justify-center overflow-hidden rounded-full bg-sidebar-primary text-2xl font-semibold text-sidebar-primary-foreground">
                    {photoPreviewUrl ? (
                      <img src={photoPreviewUrl} alt="Profile" className="size-full object-cover" />
                    ) : (
                      user.name?.[0]?.toUpperCase() ?? '?'
                    )}
                  </div>
                  <span className="absolute bottom-0 right-0 flex size-5 items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground">
                    <Pencil className="size-2.5" />
                  </span>
                </button>
                <Input
                  id="profile-photo"
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  aria-label="Profile picture"
                  onChange={handlePhotoFileChange}
                  className="hidden"
                />
                {photoPreviewUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto} disabled={photoSaving}>
                    Remove photo
                  </Button>
                )}
                {photoSaving && <p className="text-xs text-muted-foreground">Saving...</p>}
                {photoError && <p className="text-xs text-destructive">{photoError}</p>}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-name" required>Name</Label>
              <Input id="profile-name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email" required>Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {emailChanged && (
              <div className="space-y-2">
                <Label htmlFor="profile-email-current-password" required>Current password (to confirm email change)</Label>
                <PasswordInput
                  id="profile-email-current-password"
                  fieldLabel="current password for email change"
                  value={emailCurrentPassword}
                  onChange={(e) => setEmailCurrentPassword(e.target.value)}
                  required
                />
              </div>
            )}
            {profileError && <p className="text-sm text-destructive">{profileError}</p>}
            {profileSuccess && <p className="text-sm text-muted-foreground">Profile saved.</p>}
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <h2 className="contents">Change Password</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password-current" required>Current password</Label>
              <PasswordInput
                id="password-current"
                fieldLabel="current password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-new" required>New password</Label>
              <PasswordInput
                id="password-new"
                fieldLabel="new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                minLength={8}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password-confirm" required>Confirm new password</Label>
              <PasswordInput
                id="password-confirm"
                fieldLabel="new password confirmation"
                value={confirmNewPassword}
                onChange={(e) => setConfirmNewPassword(e.target.value)}
                required
              />
            </div>
            {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
            {passwordSuccess && <p className="text-sm text-muted-foreground">Password changed.</p>}
            <Button type="submit">Change password</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
