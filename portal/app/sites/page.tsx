import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import SitesPage from "@/components/screens/Sites/SitesPage";

export default function Page() {
    return (
        <PageAccess isAuthRequired={true}>
            <SitesPage />
            <Bottombar />
        </PageAccess>
    )
}