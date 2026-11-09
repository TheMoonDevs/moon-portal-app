import { redirect } from 'next/navigation';

/** Your profile: your own page, opened on its Documents tab. */
export default function Profile() {
  redirect('/user?tab=documents');
}
