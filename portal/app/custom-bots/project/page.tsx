import { PageAccess } from "@/components/global/PageAccess";

const ProjectsListPage = () => {
    return (
        <PageAccess isAuthRequired={true}>
            <div>Invalid Page</div>
        </PageAccess>
    );
}

export default ProjectsListPage;