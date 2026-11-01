import type { Metadata } from 'next';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { CoursePage } from '@/components/screens/Courses/CoursePage';

export const metadata: Metadata = { title: 'Course - Portal' };

// New hires get this link with their sign-in (the Portal course); others can
// open any course of their company.
export default function Course({ params }: { params: { courseId: string } }) {
  return (
    <PageAccess isAuthRequired={true} hasBottombar={false}>
      <CoursePage courseId={params.courseId} />
      <Bottombar visible={false} />
    </PageAccess>
  );
}
