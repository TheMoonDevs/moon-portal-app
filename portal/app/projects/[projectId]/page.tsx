import { Suspense } from 'react';

import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { ProjectPage } from '@/components/screens/Project/ProjectPage';

const Project = ({ params }: { params: { projectId: string } }) => (
  <PageAccess isAuthRequired={true}>
    <Suspense>
      <ProjectPage projectId={params.projectId} />
    </Suspense>
    <Bottombar visible={true} />
  </PageAccess>
);

export default Project;
