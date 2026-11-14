import { Suspense } from 'react';

import { ProjectPage } from '@/components/screens/Project/ProjectPage';

const Project = ({ params }: { params: { projectId: string } }) => (
  <Suspense>
    <ProjectPage projectId={params.projectId} />
  </Suspense>
);

export default Project;
