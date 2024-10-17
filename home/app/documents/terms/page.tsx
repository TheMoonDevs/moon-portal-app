import { Metadata } from 'next';
import {
  DocumentPage,
} from '@/components/Pages/docs/DocumentPage';
import { DocumentPageType } from '@/utils/constants/AppInfo';

export const metadata: Metadata = {
  title: 'Terms and Conditions',
  description: 'Read our terms and conditions carefully.',
  robots: 'noindex,nofollow',
};

const Terms = () => {
  //   const sanitizedData = () => ({
  //     __html: DOMPurify.sanitize(data),
  //   });
  return <DocumentPage docType={DocumentPageType.TERMS} />;
};

export default Terms;
