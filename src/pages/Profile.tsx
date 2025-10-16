import { ProfileSection } from '@/components/dashboard/ProfileSection';
import { GroupsManagement } from '@/components/profile/GroupsManagement';

const Profile = () => {
  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <ProfileSection />
      <GroupsManagement />
    </div>
  );
};

export default Profile;
