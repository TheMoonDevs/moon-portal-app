import { Metadata } from 'next';
import {
  DocumentPage,
} from '@/components/Pages/docs/DocumentPage';
import { DocumentPageType } from '@/utils/constants/AppInfo';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  robots: 'noindex,nofollow',
};

const Privacy = () => {
  return <DocumentPage docType={DocumentPageType.PRIVACY} />;
};

export default Privacy;
