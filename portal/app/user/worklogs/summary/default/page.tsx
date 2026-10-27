import { redirect } from 'next/navigation';

import { APP_ROUTES } from '@/utils/constants/appInfo';

/** The worklog summary became the person's page. */
export default function OldSummaryPage() {
  redirect(APP_ROUTES.user);
}
