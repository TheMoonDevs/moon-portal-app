import { useCallback, useEffect } from "react";
import { FirebaseSDK } from "../service/firebase";
import { useSearchParams } from "next/navigation";

const useCampaignAnalytics = (autolog?: boolean) => {
  const queryParams = useSearchParams();

  const logEventsFromQuery = useCallback(() => {
    if (queryParams) {
      const campaign = queryParams.get("campaign");
      const strategy = queryParams.get("strategy");
      const strategem = queryParams.get("strategem");
      if (campaign) {
        FirebaseSDK.logEvents(campaign, {
          strategy,
          strategem,
        });
      }
    }
  }, [queryParams]);

  useEffect(() => {
    if (autolog && logEventsFromQuery) {
      logEventsFromQuery();
    }
  }, [autolog, logEventsFromQuery]);

  return { logEventsFromQuery };
};

export default useCampaignAnalytics;
