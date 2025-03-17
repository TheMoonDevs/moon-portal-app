import { PageAccess } from '@/components/global/PageAccess';
import { ProjectPage } from '@/components/screens/CustomBots/ProjectPage/ProjectPage';

export default function ProjectDashbaordPage({
    params,
}: {
    params: {
        project_id: string;
    };
}) {
    return (
        <PageAccess isAuthRequired={true}>
            <ProjectPage />
        </PageAccess>
    );
}
