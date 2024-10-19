import { Metadata } from 'next';
import {
  DocumentPage,
} from '@/components/Pages/docs/DocumentPage';
import { DocumentPageType } from '@/utils/constants/AppInfo';

export const metadata: Metadata = {
  title: 'Sense Privacy Policy',
  description: 'Read our Sense Privacy Policy carefully.',
  robots: 'noindex,nofollow',
};

const Privacy = () => {
  return <DocumentPage docType={DocumentPageType.SENSE_PRIVACY} />;
};

export default Privacy;
