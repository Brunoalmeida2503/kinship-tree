import { ProfileSection } from '@/components/dashboard/ProfileSection';
import { GroupsManagement } from '@/components/profile/GroupsManagement';

const Profile = () => {
  return (
    <div className="container mx-auto p-3 sm:p-4 md:p-6 max-w-4xl space-y-4 sm:space-y-5 md:space-y-6">
      <ProfileSection />
      <GroupsManagement />
    </div>
  );
};

export default Profile;
