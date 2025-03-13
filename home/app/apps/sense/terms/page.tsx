import { Metadata } from 'next';
import {
  DocumentPage,
} from '@/components/Pages/docs/DocumentPage';
import { DocumentPageType } from '@/utils/constants/AppInfo';

export const metadata: Metadata = {
  title: 'Sense Terms and Conditions',
  description: 'Read our terms and conditions for using the Sense application.',
  robots: 'noindex,nofollow',
};

const Terms = () => {
  return <DocumentPage docType={DocumentPageType.SENSE_TERMS} />;
};

export default Terms;
