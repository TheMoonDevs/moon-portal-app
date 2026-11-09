import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { HiringSpace } from '@/components/screens/Hiring/HiringSpace';

export default function HiringPage() {
  return (
    // Hiring, onboarding and courses, for people with hiring or courses
    // access in a company; everyone else is sent home.
    <PageAccess isAuthRequired={true} hasBottombar={false}>
      <HiringSpace />
      <Bottombar visible={false} />
    </PageAccess>
  );
}
