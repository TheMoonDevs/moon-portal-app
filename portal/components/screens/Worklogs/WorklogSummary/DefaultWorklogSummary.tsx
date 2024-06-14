"use client";

import { PageAccess } from "@/components/global/PageAccess";
import { WorklogSummaryByUserId } from "./WorklogSummaryByUserId";
import { Bottombar } from "@/components/global/Bottombar";
import media from "@/styles/media";
import { useUser } from "@/utils/hooks/useUser";

export const DefaultWorklogSummary = () => {
  const { user } = useUser();
  return (
    <PageAccess isAuthRequired={true}>
      <WorklogSummaryByUserId userData={user} />
      <Bottombar visibleOnlyOn={media.moreTablet} />
    </PageAccess>
  );
};
