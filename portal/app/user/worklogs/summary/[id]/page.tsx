import { Bottombar } from "@/components/global/Bottombar";
import { PageAccess } from "@/components/global/PageAccess";
import { WorklogSummaryByUserId } from "@/components/screens/Worklogs/WorklogSummary/WorklogSummaryByUserId";
import media from "@/styles/media";
import { APP_BASE_URL } from "@/utils/constants/appInfo";
import { PortalSdk } from "@/utils/services/PortalSdk";
import { USERROLE } from "@prisma/client";

export const revalidate = 0;
async function getUserDetailsFromUserId(userId: string) {
  console.log(userId);
  try {
    const user = await PortalSdk.getData(
      `${APP_BASE_URL}/api/user?id=${userId}&role=${USERROLE.CORETEAM}`,
      null
    );
    console.log(user);
    return user.data.user[0];
  } catch (e) {
    console.log(e);
  }
}

export default async function WorklogViewPage({
  params,
}: {
  params: {
    id: string;
  };
}) {
  const response = await getUserDetailsFromUserId(params.id);
  console.log(response, "page");
  return (
    <PageAccess isAuthRequired={true}>
      <WorklogSummaryByUserId userId={params.id} userData={response} />
      <Bottombar visibleOnlyOn={media.moreTablet} />
    </PageAccess>
  );
}
