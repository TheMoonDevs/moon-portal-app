import { Bottombar } from '@/components/global/Bottombar';
import { PageAccess } from '@/components/global/PageAccess';
import { ProjectsShell } from '@/components/screens/Projects/ProjectsShell';

/** Home and every project share one sidebar, so it stays put between them. */
const ProjectsLayout = ({ children }: { children: React.ReactNode }) => (
  <PageAccess isAuthRequired={true}>
    <ProjectsShell>{children}</ProjectsShell>
    <Bottombar visible={true} />
  </PageAccess>
);

export default ProjectsLayout;
