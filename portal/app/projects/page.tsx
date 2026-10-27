import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { ProjectsOverview } from '@/components/screens/Projects/ProjectsOverview';

const Projects = () => (
  <PageAccess isAuthRequired={true}>
    <ProjectsOverview />
    <Bottombar visible={true} />
  </PageAccess>
);

export default Projects;
