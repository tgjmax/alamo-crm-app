import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import SettingsPage from './SettingsPage';
import * as usersApi from '../api/users.api';
import * as organizationApi from '../api/organization.api';
import { useAuthStore } from '../stores/authStore';

function renderWithClient(ui: React.ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

const ADMIN_USER = { id: 'u1', name: 'Admin User', email: 'admin@alamo.test', role: 'admin' as const };
const AGENT_USER = { id: 'u2', name: 'Agent User', email: 'agent@alamo.test', role: 'agent' as const };

describe('SettingsPage', () => {
  afterEach(() => {
    useAuthStore.setState({ accessToken: null, user: null });
  });

  it('pre-fills the profile form with the current user and saves a name-only change with no password', async () => {
    useAuthStore.setState({ accessToken: 't', user: ADMIN_USER });
    const update = vi.spyOn(usersApi, 'updateProfile').mockResolvedValue({ ...ADMIN_USER, name: 'New Name' });
    renderWithClient(<SettingsPage />);

    const nameInput = await screen.findByLabelText('Name');
    expect(nameInput).toHaveValue('Admin User');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Name');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ name: 'New Name', email: 'admin@alamo.test' });
      expect(useAuthStore.getState().user?.name).toBe('New Name');
    });
  });

  it('requires a current password only when the email is actually changed', async () => {
    useAuthStore.setState({ accessToken: 't', user: ADMIN_USER });
    renderWithClient(<SettingsPage />);

    await screen.findByLabelText('Name');
    expect(screen.queryByLabelText('Current password (to confirm email change)')).not.toBeInTheDocument();

    const emailInput = screen.getByLabelText('Email');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'new@alamo.test');

    expect(await screen.findByLabelText('Current password (to confirm email change)')).toBeInTheDocument();
  });

  it('submits the email change with the current password', async () => {
    useAuthStore.setState({ accessToken: 't', user: ADMIN_USER });
    const update = vi.spyOn(usersApi, 'updateProfile').mockResolvedValue({ ...ADMIN_USER, email: 'new@alamo.test' });
    renderWithClient(<SettingsPage />);

    const emailInput = await screen.findByLabelText('Email');
    await userEvent.clear(emailInput);
    await userEvent.type(emailInput, 'new@alamo.test');
    await userEvent.type(await screen.findByLabelText('Current password (to confirm email change)'), 'mypassword');
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({
        name: 'Admin User',
        email: 'new@alamo.test',
        currentPassword: 'mypassword',
      });
    });
  });

  it('shows an inline error and does not call the API when new-password confirmation does not match', async () => {
    useAuthStore.setState({ accessToken: 't', user: ADMIN_USER });
    const update = vi.spyOn(usersApi, 'updateProfile');
    renderWithClient(<SettingsPage />);

    await userEvent.type(await screen.findByLabelText('Current password'), 'oldpassword');
    await userEvent.type(screen.getByLabelText('New password'), 'newpassword123');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'different123');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));

    expect(await screen.findByText('New password and confirmation do not match.')).toBeInTheDocument();
    expect(update).not.toHaveBeenCalled();
  });

  it('changes the password and clears the fields on success', async () => {
    useAuthStore.setState({ accessToken: 't', user: ADMIN_USER });
    vi.spyOn(usersApi, 'updateProfile').mockResolvedValue(ADMIN_USER);
    renderWithClient(<SettingsPage />);

    const currentPasswordInput = await screen.findByLabelText('Current password');
    await userEvent.type(currentPasswordInput, 'oldpassword');
    await userEvent.type(screen.getByLabelText('New password'), 'newpassword123');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'newpassword123');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));

    await waitFor(() => {
      expect(screen.getByText('Password changed.')).toBeInTheDocument();
    });
    expect(currentPasswordInput).toHaveValue('');
  });

  it('opens the file picker when the avatar is clicked', async () => {
    useAuthStore.setState({ accessToken: 't', user: ADMIN_USER });
    renderWithClient(<SettingsPage />);

    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click');
    await userEvent.click(await screen.findByRole('button', { name: 'Change profile picture' }));

    expect(clickSpy).toHaveBeenCalled();
  });

  it('uploads a new profile picture and saves it immediately, with no Save profile click needed', async () => {
    useAuthStore.setState({ accessToken: 't', user: ADMIN_USER });
    const upload = vi.spyOn(usersApi, 'uploadProfilePhotoFile').mockResolvedValue('profile-pictures/u1');
    const update = vi.spyOn(usersApi, 'updateProfile').mockResolvedValue({ ...ADMIN_USER, photoUrl: 'https://signed.example.com/new.jpg' });
    renderWithClient(<SettingsPage />);

    const file = new File(['fake image data'], 'me.png', { type: 'image/png' });
    await userEvent.upload(await screen.findByLabelText('Profile picture'), file);

    await waitFor(() => {
      expect(upload).toHaveBeenCalledWith(file);
      expect(update).toHaveBeenCalledWith({ photoS3Key: 'profile-pictures/u1' });
      expect(useAuthStore.getState().user?.photoUrl).toBe('https://signed.example.com/new.jpg');
    });
  });

  it('removes an existing profile picture immediately when Remove photo is clicked', async () => {
    useAuthStore.setState({
      accessToken: 't',
      user: { ...ADMIN_USER, photoUrl: 'https://signed.example.com/existing.jpg' },
    });
    const update = vi.spyOn(usersApi, 'updateProfile').mockResolvedValue({ ...ADMIN_USER, photoUrl: null });
    renderWithClient(<SettingsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Remove photo' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ photoS3Key: null });
      expect(useAuthStore.getState().user?.photoUrl).toBeNull();
    });
  });

  it('shows an inline error and restores the previous photo if the upload fails', async () => {
    useAuthStore.setState({
      accessToken: 't',
      user: { ...ADMIN_USER, photoUrl: 'https://signed.example.com/existing.jpg' },
    });
    vi.spyOn(usersApi, 'uploadProfilePhotoFile').mockRejectedValue(new Error('upload failed'));
    renderWithClient(<SettingsPage />);

    const file = new File(['fake image data'], 'me.png', { type: 'image/png' });
    await userEvent.upload(await screen.findByLabelText('Profile picture'), file);

    expect(await screen.findByText('Could not update profile picture. Please try again.')).toBeInTheDocument();
    expect(screen.getByAltText('Profile')).toHaveAttribute('src', 'https://signed.example.com/existing.jpg');
  });

  it('never includes photoS3Key when saving Name/Email — the photo has its own independent save', async () => {
    useAuthStore.setState({ accessToken: 't', user: ADMIN_USER });
    const update = vi.spyOn(usersApi, 'updateProfile').mockResolvedValue(ADMIN_USER);
    renderWithClient(<SettingsPage />);

    await userEvent.click(await screen.findByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(update).toHaveBeenCalledWith({ name: 'Admin User', email: 'admin@alamo.test' });
    });
  });

  it('shows the Organization tab for an admin', async () => {
    vi.spyOn(organizationApi, 'getBranding').mockResolvedValue({ name: 'Alamo Travels', tagline: 'Internal CRM', logoUrl: null });
    useAuthStore.setState({ accessToken: 't', user: ADMIN_USER });
    renderWithClient(<SettingsPage />);
    expect(await screen.findByRole('tab', { name: 'Organization' })).toBeInTheDocument();
  });

  it('hides the Organization tab for an agent', async () => {
    useAuthStore.setState({ accessToken: 't', user: AGENT_USER });
    renderWithClient(<SettingsPage />);
    await screen.findByLabelText('Name');
    expect(screen.queryByRole('tab', { name: 'Organization' })).not.toBeInTheDocument();
  });

  it('saves organization branding, uploading a new logo when one is chosen', async () => {
    vi.spyOn(organizationApi, 'getBranding').mockResolvedValue({ name: 'Alamo Travels', tagline: 'Internal CRM', logoUrl: null });
    const upload = vi.spyOn(organizationApi, 'uploadLogoFile').mockResolvedValue('branding/new-logo.png');
    const update = vi.spyOn(organizationApi, 'updateBranding').mockResolvedValue({ name: 'New Co', tagline: 'New Tag', logoS3Key: 'branding/new-logo.png' });
    useAuthStore.setState({ accessToken: 't', user: ADMIN_USER });
    renderWithClient(<SettingsPage />);

    await userEvent.click(await screen.findByRole('tab', { name: 'Organization' }));
    const nameInput = await screen.findByLabelText('Organization name');
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'New Co');

    const file = new File(['fake image data'], 'logo.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Logo'), file);

    await userEvent.click(screen.getByRole('button', { name: 'Save organization' }));

    await waitFor(() => {
      expect(upload).toHaveBeenCalledWith(file);
      expect(update).toHaveBeenCalledWith({ name: 'New Co', tagline: 'Internal CRM', logoS3Key: 'branding/new-logo.png' });
    });
  });
});
