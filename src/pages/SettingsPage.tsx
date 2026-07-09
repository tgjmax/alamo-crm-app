import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/authStore';
import { canEditOrganization } from '@/utils/permissions';
import { getBranding } from '@/api/organization.api';
import { ProfileTab } from '@/components/settings/profile-tab';
import { OrganizationTab } from '@/components/settings/organization-tab';

export default function SettingsPage() {
  const user = useAuthStore((s) => s.user);
  const showOrganization = canEditOrganization(user);
  const { data: branding } = useQuery({
    queryKey: ['organization', 'branding'],
    queryFn: getBranding,
    enabled: showOrganization,
  });

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">My Profile</TabsTrigger>
          {showOrganization && <TabsTrigger value="organization">Organization</TabsTrigger>}
        </TabsList>
        <TabsContent value="profile">
          <ProfileTab user={user} />
        </TabsContent>
        {showOrganization && (
          <TabsContent value="organization">
            {branding && <OrganizationTab branding={branding} />}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
