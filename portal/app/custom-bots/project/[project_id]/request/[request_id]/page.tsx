import { PageAccess } from '@/components/global/PageAccess';
import { RequestPage } from '@/components/screens/CustomBots/RequestPage/RequestPage';


export default function RequestWindow({
    params,
}: {
    params: {
        request_id: string;
        project_id: string;
    };
}) {
    return (
        <PageAccess isAuthRequired={true}>
            <RequestPage />
        </PageAccess>
    );
}
