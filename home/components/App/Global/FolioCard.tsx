import { cn } from '@/lib/utils';
import { APP_INFO } from '@/utils/constants/AppInfo';
import { Check, Loader2 } from 'lucide-react';
import React, { useState } from 'react';

const DevFolioCard = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }) => {
  const [subscriptionStatus, setSubscriptionStatus] = useState<
    'PENDING' | 'SUCCESS' | 'ERROR' | 'IDLE'
  >('IDLE');
  const [statusMessage, setStatusMessage] = useState<{
    message: string;
    type: 'SUCCESS' | 'ERROR' | null;
  }>({
    message: '',
    type: null,
  });
  const handleDownloadFolio = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubscriptionStatus('PENDING');
    try {
      const formData = new FormData(e.currentTarget);
      const email = formData.get('email') || '';

      //1. call a subscription api
      await fetch(`${APP_INFO.serverApiUrl}/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          tmd_portal_api_key: 'sdfbvhszebdrdherfusdbkrehfirbcnvsdicns',
        },
        body: JSON.stringify({
          email,
          context: 'devfolio',
          source: `${APP_INFO.base_url}/folios`,
        }),
      });

      // 3. send an email to the user
      await fetch(
        'https://7vhx1xtjc1.execute-api.ap-southeast-2.amazonaws.com/latest/send-email',
        {
          method: 'POST',
          body: JSON.stringify({
            to: email,
            subject: 'Find your Dev Folio attached to this email!',
            body: `<div style="font-family: Arial, sans-serif; color: #333; padding: 20px;">
          <h2 style="color: #2D89FF;">Get Your Informative Guide 🚀</h2>
          <p>Hey ${email},</p>
          <p>Our teams have helped more than <strong>56 startups</strong> and worked on <strong>132 feature requests</strong> to drive innovation across the globe.</p>
          <p>Now, we’re bringing you an exclusive guide packed with insights and strategies for success.</p>
          <p><strong>Your Dev Folio is attached in this email.</strong></p>
          <p>If you have any questions or need further insights, feel free to reach out!</p>
          <p>Best,<br>The Moon Devs Team</p>
        </div>`, // renders HTML as well
            sender: '', // optional, default as 'no-reply@themoondevs.com'
            displayName: '', // optional, default as 'The Moon Devs'
          }),
        },
      );
      setSubscriptionStatus('SUCCESS');
      setStatusMessage({
        message: 'Your Dev Folio has been emailed to you. 🎉 Check your inbox.',
        type: 'SUCCESS',
      });
    } catch (e) {
      console.log(e);
      setSubscriptionStatus('ERROR');
      setStatusMessage({
        message: 'Hmm... something went wrong. Give it another try! 🚀',
        type: 'ERROR',
      });
    } finally {
      setTimeout(() => setSubscriptionStatus('IDLE'), 3000);
    }
  };
  return (
    <div className={cn('flex w-fit flex-col gap-4', className)}>
      <h1 className="text-xl font-bold xl:text-3xl">MoonDev-Folio</h1>
      <p className="text-sm text-neutral-500">
        Our teams have helped more than 56 startups, 132 Feature requests for
        many innovations across the globe. Get an informative guide
      </p>
      <form
        onSubmit={handleDownloadFolio}
        className="mt-2 flex w-full flex-col items-center rounded-full border-transparent bg-black md:mt-4 xl:flex-row xl:gap-0 xl:border-[1px] xl:border-gray-500 xl:p-1.5"
      >
        <input
          type="email"
          name="email"
          required
          onChange={(e) =>
            statusMessage.message &&
            setStatusMessage({ message: '', type: null })
          }
          placeholder="@ - Enter your Mail"
          className="w-full flex-1 rounded-full border border-gray-500 bg-transparent px-3 py-1 text-sm text-white placeholder-gray-400 outline-none xl:w-auto xl:rounded-none xl:border-none"
        />
        <button
          disabled={subscriptionStatus !== 'IDLE'}
          type="submit"
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-white bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-gray-200 disabled:cursor-default disabled:hover:bg-white xl:mt-0 xl:w-auto"
        >
          {subscriptionStatus === 'PENDING' ? (
            <Loader2 className="animate-spin" size={16} />
          ) : subscriptionStatus === 'SUCCESS' ? (
            <Check size={16} className="text-green-500" />
          ) : null}
          <span>Download</span>
        </button>
      </form>
      {statusMessage.message && (
        <div className="flex w-full items-center justify-center">
          {statusMessage.type === 'SUCCESS' && (
            <p className="text-xs text-green-500 transition-all">
              {statusMessage.message}
            </p>
          )}
          {statusMessage.type === 'ERROR' && (
            <p className="text-xs text-red-500">{statusMessage.message}</p>
          )}
        </div>
      )}
    </div>
  );
});

export default DevFolioCard;
