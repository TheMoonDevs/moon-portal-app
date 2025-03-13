import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import SiteDashboard from "@/components/screens/Sites/SiteDashboard";

export default function Page() {
    return (
        <PageAccess isAuthRequired={true}>
            <SiteDashboard />
            <Bottombar />
        </PageAccess>
    )
}